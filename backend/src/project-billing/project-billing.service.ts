import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillStatusFilter } from '../bill/dto/list-bills-query.dto';
import { percentOf, sumDecimals } from '../common/money.util';
import { monthRange, startOfTodayUtc } from '../common/period.util';
import {
  projectBillingDateBasisWhere,
  retainageReleaseWithinWhere,
} from '../common/project-billing-period.util';
import { CreateProjectBillingDto } from './dto/create-project-billing.dto';
import { ListProjectBillingsQueryDto } from './dto/list-project-billings-query.dto';
import { PayProjectBillingDto } from './dto/pay-project-billing.dto';
import { UpdateProjectBillingDto } from './dto/update-project-billing.dto';
import {
  CONCURRENT_UPDATE,
  SERIALIZABLE,
  assertRetainageCovered,
  isSerializationFailure,
} from './retainage-balance';

const projectBillingInclude = {
  company: true,
  project: true,
  bank: true,
} satisfies Prisma.ProjectBillingInclude;

type ProjectBillingWithRelations = Prisma.ProjectBillingGetPayload<{
  include: typeof projectBillingInclude;
}>;

type BankRef = { id: string; name: string; code: string };

const NOT_FOUND = 'Fatura não encontrada';
const PAYMENT_AND_BANK_TOGETHER =
  'Data de pagamento e banco devem ser informados juntos';
const PAID_AMOUNT_LOCKED =
  'Fatura paga não pode ter valor nem caução alterados; estorne o pagamento antes';

export function assertNotFuture(date: string, message: string) {
  if (new Date(date) > startOfTodayUtc()) {
    throw new BadRequestException(message);
  }
}

@Injectable()
export class ProjectBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectBillingDto) {
    const amount = this.toPositiveDecimal(dto.amount);
    const retainage = this.resolveRetainage(amount, dto);
    const payment = this.resolvePayment(dto.paymentDate, dto.bankId);

    try {
      const billing = await this.prisma.projectBilling.create({
        data: {
          number: dto.number,
          companyId: dto.companyId,
          projectId: dto.projectId,
          amount,
          ...retainage,
          dueDate: new Date(dto.dueDate),
          ...payment,
        },
        include: projectBillingInclude,
      });
      return this.toResponse(billing);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async findAll(query: ListProjectBillingsQueryDto) {
    const billings = await this.prisma.projectBilling.findMany({
      where: this.listWhere(query),
      include: projectBillingInclude,
      orderBy: [{ dueDate: 'asc' }, { number: 'asc' }],
    });
    return billings.map((billing) => this.toResponse(billing));
  }

  async summary(query: ListProjectBillingsQueryDto) {
    const includeReleases =
      !query.status || query.status === BillStatusFilter.PAID;
    const [billings, releases] = await Promise.all([
      this.prisma.projectBilling.findMany({
        where: this.listWhere(query),
        select: {
          amount: true,
          retainageAmount: true,
          netAmount: true,
          paymentDate: true,
          bank: true,
        },
      }),
      includeReleases
        ? this.prisma.retainageRelease.findMany({
            where: this.releaseWhere(query),
            select: { amount: true, bank: true },
          })
        : Promise.resolve([]),
    ]);

    const zero = () => new Prisma.Decimal(0);
    const banks = new Map<
      string,
      { bank: BankRef; billings: Prisma.Decimal; releases: Prisma.Decimal }
    >();
    const bankEntry = (bank: BankRef) => {
      const entry = banks.get(bank.id) ?? {
        bank,
        billings: zero(),
        releases: zero(),
      };
      banks.set(bank.id, entry);
      return entry;
    };

    const paid = billings.filter((billing) => billing.paymentDate !== null);
    for (const billing of paid) {
      if (billing.bank) {
        const entry = bankEntry(billing.bank);
        entry.billings = entry.billings.plus(billing.netAmount);
      }
    }
    for (const release of releases) {
      const entry = bankEntry(release.bank);
      entry.releases = entry.releases.plus(release.amount);
    }

    const received = sumDecimals(paid.map((billing) => billing.netAmount));
    const released = sumDecimals(releases.map((release) => release.amount));
    const net = sumDecimals(billings.map((billing) => billing.netAmount));

    return {
      billingCount: billings.length,
      paidCount: paid.length,
      invoiced: sumDecimals(billings.map((billing) => billing.amount)).toFixed(
        2,
      ),
      retainage: sumDecimals(
        billings.map((billing) => billing.retainageAmount),
      ).toFixed(2),
      net: net.toFixed(2),
      received: received.toFixed(2),
      outstanding: net.minus(received).toFixed(2),
      releaseCount: releases.length,
      retainageReleased: released.toFixed(2),
      totalReceived: received.plus(released).toFixed(2),
      receivedByBank: [...banks.values()]
        .sort((a, b) => a.bank.name.localeCompare(b.bank.name, 'pt-BR'))
        .map((entry) => ({
          bankId: entry.bank.id,
          bankName: entry.bank.name,
          bankCode: entry.bank.code,
          billings: entry.billings.toFixed(2),
          retainageReleases: entry.releases.toFixed(2),
          total: entry.billings.plus(entry.releases).toFixed(2),
        })),
    };
  }

  async findOne(id: string) {
    const billing = await this.prisma.projectBilling.findUnique({
      where: { id },
      include: projectBillingInclude,
    });
    if (!billing) {
      throw new NotFoundException(NOT_FOUND);
    }
    return this.toResponse(billing);
  }

  async update(id: string, dto: UpdateProjectBillingDto) {
    const existing = await this.prisma.projectBilling.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }

    const amount =
      dto.amount === undefined
        ? existing.amount
        : this.toPositiveDecimal(dto.amount);
    const retainage = this.resolveRetainage(amount, dto, existing);

    if (
      existing.paymentDate &&
      (!amount.equals(existing.amount) ||
        !retainage.retainageAmount.equals(existing.retainageAmount))
    ) {
      throw new ConflictException(PAID_AMOUNT_LOCKED);
    }

    try {
      const billing = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.projectBilling.update({
          where: { id },
          data: {
            number: dto.number,
            companyId: dto.companyId,
            projectId: dto.projectId,
            amount,
            ...retainage,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          },
          include: projectBillingInclude,
        });
        await assertRetainageCovered(tx, [
          { projectId: existing.projectId, companyId: existing.companyId },
          { projectId: updated.projectId, companyId: updated.companyId },
        ]);
        return updated;
      }, SERIALIZABLE);
      return this.toResponse(billing);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.projectBilling.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (existing.paymentDate) {
      throw new ConflictException(
        'Não é possível excluir uma fatura paga; estorne o pagamento antes',
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.projectBilling.delete({ where: { id } });
        await assertRetainageCovered(tx, [
          { projectId: existing.projectId, companyId: existing.companyId },
        ]);
      }, SERIALIZABLE);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async registerPayment(id: string, dto: PayProjectBillingDto) {
    const existing = await this.prisma.projectBilling.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (existing.paymentDate) {
      throw new ConflictException('Esta fatura já está paga');
    }
    assertNotFuture(dto.paymentDate, 'Data de pagamento não pode ser futura');

    try {
      const billing = await this.prisma.projectBilling.update({
        where: { id },
        data: { paymentDate: new Date(dto.paymentDate), bankId: dto.bankId },
        include: projectBillingInclude,
      });
      return this.toResponse(billing);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async removePayment(id: string) {
    const existing = await this.prisma.projectBilling.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (!existing.paymentDate) {
      throw new ConflictException(
        'Esta fatura não possui pagamento registrado',
      );
    }

    const billing = await this.prisma.projectBilling.update({
      where: { id },
      data: { paymentDate: null, bankId: null },
      include: projectBillingInclude,
    });
    return this.toResponse(billing);
  }

  private listWhere(
    query: ListProjectBillingsQueryDto,
  ): Prisma.ProjectBillingWhereInput {
    const filters: Prisma.ProjectBillingWhereInput[] = [];
    if (query.companyId) {
      filters.push({ companyId: query.companyId });
    }
    if (query.projectId) {
      filters.push({ projectId: query.projectId });
    }
    if (query.bankId) {
      filters.push({ bankId: query.bankId });
    }
    if (query.status === BillStatusFilter.PAID) {
      filters.push({ paymentDate: { not: null } });
    }
    if (query.status === BillStatusFilter.PENDING) {
      filters.push({ paymentDate: null, dueDate: { gte: startOfTodayUtc() } });
    }
    if (query.status === BillStatusFilter.OVERDUE) {
      filters.push({ paymentDate: null, dueDate: { lt: startOfTodayUtc() } });
    }
    if (query.month) {
      const { start, end } = monthRange(query.month);
      filters.push(projectBillingDateBasisWhere(start, end, query.dateBasis));
    }
    return filters.length > 0 ? { AND: filters } : {};
  }

  private releaseWhere(
    query: ListProjectBillingsQueryDto,
  ): Prisma.RetainageReleaseWhereInput {
    const filters: Prisma.RetainageReleaseWhereInput[] = [];
    if (query.companyId) {
      filters.push({ companyId: query.companyId });
    }
    if (query.projectId) {
      filters.push({ projectId: query.projectId });
    }
    if (query.bankId) {
      filters.push({ bankId: query.bankId });
    }
    if (query.month) {
      const { start, end } = monthRange(query.month);
      filters.push(retainageReleaseWithinWhere(start, end));
    }
    return filters.length > 0 ? { AND: filters } : {};
  }

  private resolveRetainage(
    amount: Prisma.Decimal,
    dto: Pick<CreateProjectBillingDto, 'retainageAmount' | 'retainagePercent'>,
    existing?: {
      retainageAmount: Prisma.Decimal;
      retainagePercent: Prisma.Decimal | null;
    },
  ) {
    if (
      dto.retainageAmount !== undefined &&
      dto.retainagePercent !== undefined
    ) {
      throw new BadRequestException(
        'Informe a caução em percentual ou em valor, não os dois',
      );
    }

    let retainagePercent: Prisma.Decimal | null = null;
    let retainageAmount = new Prisma.Decimal(0);
    if (dto.retainagePercent !== undefined) {
      retainagePercent = new Prisma.Decimal(dto.retainagePercent);
      retainageAmount = percentOf(amount, retainagePercent);
    } else if (dto.retainageAmount !== undefined) {
      retainageAmount = new Prisma.Decimal(dto.retainageAmount);
    } else if (existing?.retainagePercent) {
      retainagePercent = existing.retainagePercent;
      retainageAmount = percentOf(amount, retainagePercent);
    } else if (existing) {
      retainageAmount = existing.retainageAmount;
    }

    if (retainageAmount.gte(amount)) {
      throw new BadRequestException(
        'Caução deve ser menor que o valor da fatura',
      );
    }
    return {
      retainageAmount,
      retainagePercent,
      netAmount: amount.minus(retainageAmount),
    };
  }

  private resolvePayment(paymentDate?: string, bankId?: string) {
    if (!paymentDate && !bankId) {
      return { paymentDate: null, bankId: null };
    }
    if (!paymentDate || !bankId) {
      throw new BadRequestException(PAYMENT_AND_BANK_TOGETHER);
    }
    assertNotFuture(paymentDate, 'Data de pagamento não pode ser futura');
    return { paymentDate: new Date(paymentDate), bankId };
  }

  private toPositiveDecimal(value: string) {
    const decimal = new Prisma.Decimal(value);
    if (decimal.lte(0)) {
      throw new BadRequestException('Valor da fatura deve ser maior que zero');
    }
    return decimal;
  }

  private toResponse(billing: ProjectBillingWithRelations) {
    const effectiveStatus = billing.paymentDate
      ? BillStatusFilter.PAID
      : billing.dueDate < startOfTodayUtc()
        ? BillStatusFilter.OVERDUE
        : BillStatusFilter.PENDING;
    return {
      ...billing,
      amount: billing.amount.toFixed(2),
      retainageAmount: billing.retainageAmount.toFixed(2),
      retainagePercent: billing.retainagePercent?.toFixed(2) ?? null,
      netAmount: billing.netAmount.toFixed(2),
      effectiveStatus,
    };
  }

  private translateWriteError(error: unknown) {
    if (isSerializationFailure(error)) {
      return new ConflictException(CONCURRENT_UPDATE);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          'Já existe uma fatura com esse número nesta empresa',
        );
      }
      if (error.code === 'P2003') {
        const field = String(error.meta?.field_name ?? '');
        if (field.includes('companyId')) {
          return new BadRequestException('Empresa informada não existe');
        }
        if (field.includes('projectId')) {
          return new BadRequestException('Obra informada não existe');
        }
        if (field.includes('bankId')) {
          return new BadRequestException('Banco informado não existe');
        }
        return new BadRequestException('Registro relacionado não existe');
      }
      if (error.code === 'P2025') {
        return new NotFoundException(NOT_FOUND);
      }
    }
    return error;
  }
}
