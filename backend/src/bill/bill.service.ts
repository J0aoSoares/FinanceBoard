import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { billPeriodWhere } from '../common/bill-period.util';
import { monthRange, startOfTodayUtc } from '../common/period.util';
import { BillWithholdingDto, CreateBillDto } from './dto/create-bill.dto';
import {
  BillStatusFilter,
  CashflowRegime,
  ListBillsQueryDto,
} from './dto/list-bills-query.dto';
import { PayBillDto } from './dto/pay-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

const billInclude = {
  company: true,
  project: true,
  category: true,
  supplier: true,
  invoice: true,
  taxWithholdings: true,
} satisfies Prisma.BillInclude;

type BillWithRelations = Prisma.BillGetPayload<{ include: typeof billInclude }>;

@Injectable()
export class BillService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBillDto) {
    const withholdings = dto.withholdings ?? [];
    this.assertNoDuplicateWithholdingTypes(withholdings);
    const grossAmount = this.toPositiveDecimal(
      dto.grossAmount,
      'Valor bruto deve ser maior que zero',
    );
    const netAmount = this.computeNetAmount(grossAmount, withholdings);
    this.assertDateOrder(dto.issueDate, dto.dueDate);

    try {
      const bill = await this.prisma.bill.create({
        data: {
          documentNumber: dto.documentNumber,
          grossAmount,
          netAmount,
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          hasTaxWithholding: withholdings.length > 0,
          companyId: dto.companyId,
          projectId: dto.projectId ?? null,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
          taxWithholdings: {
            create: withholdings.map((w) => ({
              type: w.type,
              amount: new Prisma.Decimal(w.amount),
            })),
          },
        },
        include: billInclude,
      });
      return this.withEffectiveStatus(bill);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async findAll(query: ListBillsQueryDto) {
    const filters: Prisma.BillWhereInput[] = [];

    if (query.companyId) {
      filters.push({ companyId: query.companyId });
    }
    if (query.projectId) {
      filters.push({ projectId: query.projectId });
    }
    if (query.categoryId) {
      filters.push({ categoryId: query.categoryId });
    }
    if (query.supplierId) {
      filters.push({ supplierId: query.supplierId });
    }
    if (query.status) {
      filters.push(this.statusFilter(query.status));
    }
    if (query.month) {
      filters.push(this.periodFilter(query.month, query.regime));
    }

    const bills = await this.prisma.bill.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: billInclude,
      orderBy: { dueDate: 'asc' },
    });
    return bills.map((bill) => this.withEffectiveStatus(bill));
  }

  private statusFilter(status: BillStatusFilter): Prisma.BillWhereInput {
    if (status === BillStatusFilter.PAID) {
      return {
        OR: [
          { invoiceId: null, status: PaymentStatus.PAID },
          { invoice: { status: PaymentStatus.PAID } },
        ],
      };
    }

    const dueDateFilter =
      status === BillStatusFilter.OVERDUE
        ? { lt: startOfTodayUtc() }
        : { gte: startOfTodayUtc() };

    return {
      OR: [
        {
          invoiceId: null,
          status: PaymentStatus.PENDING,
          dueDate: dueDateFilter,
        },
        { invoice: { status: PaymentStatus.PENDING, dueDate: dueDateFilter } },
      ],
    };
  }

  private periodFilter(
    month: string,
    regime?: CashflowRegime,
  ): Prisma.BillWhereInput {
    const { start, end } = monthRange(month);
    return billPeriodWhere(start, end, regime);
  }

  async findOne(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: billInclude,
    });
    if (!bill) {
      throw new NotFoundException('Conta não encontrada');
    }
    return this.withEffectiveStatus(bill);
  }

  async update(id: string, dto: UpdateBillDto) {
    const existing = await this.prisma.bill.findUnique({
      where: { id },
      include: { taxWithholdings: true },
    });
    if (!existing) {
      throw new NotFoundException('Conta não encontrada');
    }
    if (existing.status === PaymentStatus.PAID) {
      throw new ConflictException(
        'Não é possível editar uma conta já paga; estorne o pagamento antes',
      );
    }
    if (
      existing.invoiceId &&
      dto.companyId &&
      dto.companyId !== existing.companyId
    ) {
      throw new ConflictException(
        'Não é possível trocar a empresa de uma conta vinculada a uma fatura; remova-a da fatura antes',
      );
    }

    const withholdings =
      dto.withholdings ??
      existing.taxWithholdings.map((w) => ({
        type: w.type,
        amount: w.amount.toString(),
      }));
    this.assertNoDuplicateWithholdingTypes(withholdings);
    const grossAmount = this.toPositiveDecimal(
      dto.grossAmount ?? existing.grossAmount.toString(),
      'Valor bruto deve ser maior que zero',
    );
    const netAmount = this.computeNetAmount(grossAmount, withholdings);
    this.assertDateOrder(
      dto.issueDate ?? existing.issueDate,
      dto.dueDate ?? existing.dueDate,
    );

    try {
      const bill = await this.prisma.bill.update({
        where: { id },
        data: {
          documentNumber: dto.documentNumber,
          grossAmount,
          netAmount,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          hasTaxWithholding: withholdings.length > 0,
          companyId: dto.companyId,
          projectId: dto.projectId,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
          taxWithholdings: dto.withholdings
            ? {
                deleteMany: {},
                create: dto.withholdings.map((w) => ({
                  type: w.type,
                  amount: new Prisma.Decimal(w.amount),
                })),
              }
            : undefined,
        },
        include: billInclude,
      });
      return this.withEffectiveStatus(bill);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async registerPayment(id: string, dto: PayBillDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      throw new NotFoundException('Conta não encontrada');
    }
    if (bill.invoiceId) {
      throw new ConflictException(
        'Esta conta pertence a uma fatura; o pagamento deve ser registrado na fatura',
      );
    }
    if (bill.status === PaymentStatus.PAID) {
      throw new ConflictException('Esta conta já está paga');
    }

    const updated = await this.prisma.bill.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paymentDate: new Date(dto.paymentDate),
      },
      include: billInclude,
    });
    return this.withEffectiveStatus(updated);
  }

  async removePayment(id: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      throw new NotFoundException('Conta não encontrada');
    }
    if (bill.status !== PaymentStatus.PAID) {
      throw new ConflictException('Esta conta não possui pagamento registrado');
    }

    const updated = await this.prisma.bill.update({
      where: { id },
      data: { status: PaymentStatus.PENDING, paymentDate: null },
      include: billInclude,
    });
    return this.withEffectiveStatus(updated);
  }

  async remove(id: string) {
    try {
      await this.prisma.bill.delete({ where: { id } });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private withEffectiveStatus(bill: BillWithRelations) {
    const status = bill.invoice ? bill.invoice.status : bill.status;
    const dueDate = bill.invoice ? bill.invoice.dueDate : bill.dueDate;
    const effectiveStatus =
      status === PaymentStatus.PAID
        ? BillStatusFilter.PAID
        : dueDate < startOfTodayUtc()
          ? BillStatusFilter.OVERDUE
          : BillStatusFilter.PENDING;
    return { ...bill, effectiveStatus, effectiveDueDate: dueDate };
  }

  private toPositiveDecimal(value: string, message: string) {
    const decimal = new Prisma.Decimal(value);
    if (decimal.lte(0)) {
      throw new BadRequestException(message);
    }
    return decimal;
  }

  private computeNetAmount(
    grossAmount: Prisma.Decimal,
    withholdings: Pick<BillWithholdingDto, 'amount'>[],
  ) {
    const total = withholdings.reduce(
      (acc, w) =>
        acc.plus(
          this.toPositiveDecimal(
            w.amount,
            'Valor da retenção deve ser maior que zero',
          ),
        ),
      new Prisma.Decimal(0),
    );
    if (withholdings.length > 0 && total.gte(grossAmount)) {
      throw new BadRequestException(
        'A soma das retenções deve ser menor que o valor bruto',
      );
    }
    return grossAmount.minus(total);
  }

  private assertNoDuplicateWithholdingTypes(
    withholdings: Pick<BillWithholdingDto, 'type'>[],
  ) {
    const types = withholdings.map((w) => w.type);
    if (new Set(types).size !== types.length) {
      throw new BadRequestException(
        'Não é possível informar mais de uma retenção do mesmo tipo',
      );
    }
  }

  private assertDateOrder(issueDate: string | Date, dueDate: string | Date) {
    if (new Date(dueDate) < new Date(issueDate)) {
      throw new BadRequestException(
        'Data de vencimento não pode ser anterior à data de emissão',
      );
    }
  }

  private translateWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        const field = String(error.meta?.field_name ?? '');
        if (field.includes('companyId')) {
          return new BadRequestException('Empresa informada não existe');
        }
        if (field.includes('projectId')) {
          return new BadRequestException('Obra informada não existe');
        }
        if (field.includes('categoryId')) {
          return new BadRequestException('Categoria informada não existe');
        }
        if (field.includes('supplierId')) {
          return new BadRequestException('Fornecedor informado não existe');
        }
        return new BadRequestException('Registro relacionado não existe');
      }
      if (error.code === 'P2025') {
        return new NotFoundException('Conta não encontrada');
      }
    }
    return error;
  }
}
