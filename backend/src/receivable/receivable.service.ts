import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BillStatusFilter,
  CashflowRegime,
} from '../bill/dto/list-bills-query.dto';
import { monthRange, startOfTodayUtc } from '../common/period.util';
import {
  CreateReceivableDto,
  ReceivableWithholdingDto,
} from './dto/create-receivable.dto';
import {
  ListReceivablesQueryDto,
  ReceivableDateBasis,
} from './dto/list-receivables-query.dto';
import { ReceiveReceivableDto } from './dto/receive-receivable.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';

const receivableInclude = {
  company: true,
  project: true,
  withholdings: { orderBy: { type: 'asc' } },
} satisfies Prisma.ReceivableInclude;

type ReceivableWithRelations = Prisma.ReceivableGetPayload<{
  include: typeof receivableInclude;
}>;

const NOT_FOUND = 'Nota de serviço não encontrada';

@Injectable()
export class ReceivableService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReceivableDto) {
    const withholdings = dto.withholdings ?? [];
    const grossAmount = this.toPositiveDecimal(
      dto.grossAmount,
      'Valor bruto deve ser maior que zero',
    );
    const netAmount = this.computeNetAmount(grossAmount, withholdings);
    this.assertDateOrder(dto.issueDate, dto.dueDate);

    try {
      const receivable = await this.prisma.receivable.create({
        data: {
          number: dto.number,
          description: dto.description,
          clientName: dto.clientName,
          grossAmount,
          netAmount,
          amount: netAmount,
          competence: this.competenceDate(dto.competence),
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          companyId: dto.companyId,
          projectId: dto.projectId,
          withholdings: { create: this.withholdingRows(withholdings) },
        },
        include: receivableInclude,
      });
      return this.toResponse(receivable);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async findAll(query: ListReceivablesQueryDto) {
    if (query.regime && query.dateBasis) {
      throw new BadRequestException(
        'Informe regime ou dateBasis, não os dois ao mesmo tempo',
      );
    }

    const filters: Prisma.ReceivableWhereInput[] = [];

    if (query.companyId) {
      filters.push({ companyId: query.companyId });
    }
    if (query.projectId) {
      filters.push({ projectId: query.projectId });
    }
    if (query.status === BillStatusFilter.PAID) {
      filters.push({ status: PaymentStatus.PAID });
    }
    if (query.status === BillStatusFilter.PENDING) {
      filters.push({
        status: PaymentStatus.PENDING,
        dueDate: { gte: startOfTodayUtc() },
      });
    }
    if (query.status === BillStatusFilter.OVERDUE) {
      filters.push({
        status: PaymentStatus.PENDING,
        dueDate: { lt: startOfTodayUtc() },
      });
    }
    if (query.month) {
      const { start, end } = monthRange(query.month);
      filters.push(this.periodFilter({ gte: start, lt: end }, query));
    }

    const receivables = await this.prisma.receivable.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: receivableInclude,
      orderBy: [{ dueDate: 'asc' }, { number: 'asc' }],
    });
    return receivables.map((receivable) => this.toResponse(receivable));
  }

  private periodFilter(
    range: { gte: Date; lt: Date },
    query: ListReceivablesQueryDto,
  ): Prisma.ReceivableWhereInput {
    if (query.dateBasis === ReceivableDateBasis.COMPETENCE) {
      return { competence: range };
    }
    if (
      query.dateBasis === ReceivableDateBasis.RECEIPT ||
      query.regime === CashflowRegime.CASH
    ) {
      return { receiptDate: range };
    }
    return { issueDate: range };
  }

  async summary(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Obra não encontrada');
    }

    const receivables = await this.prisma.receivable.findMany({
      where: { projectId },
      select: { grossAmount: true, netAmount: true, status: true },
    });
    const zero = new Prisma.Decimal(0);
    const totals = receivables.reduce(
      (acc, receivable) => {
        const received = receivable.status === PaymentStatus.PAID;
        return {
          gross: acc.gross.plus(receivable.grossAmount),
          net: acc.net.plus(receivable.netAmount),
          received: received
            ? acc.received.plus(receivable.netAmount)
            : acc.received,
          outstanding: received
            ? acc.outstanding
            : acc.outstanding.plus(receivable.netAmount),
          receivedCount: acc.receivedCount + (received ? 1 : 0),
        };
      },
      {
        gross: zero,
        net: zero,
        received: zero,
        outstanding: zero,
        receivedCount: 0,
      },
    );

    return {
      projectId,
      invoiceCount: receivables.length,
      receivedCount: totals.receivedCount,
      grossInvoiced: totals.gross.toFixed(2),
      withholdingTotal: totals.gross.minus(totals.net).toFixed(2),
      netInvoiced: totals.net.toFixed(2),
      received: totals.received.toFixed(2),
      outstanding: totals.outstanding.toFixed(2),
    };
  }

  async findOne(id: string) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
      include: receivableInclude,
    });
    if (!receivable) {
      throw new NotFoundException(NOT_FOUND);
    }
    return this.toResponse(receivable);
  }

  async update(id: string, dto: UpdateReceivableDto) {
    const existing = await this.prisma.receivable.findUnique({
      where: { id },
      include: { withholdings: true },
    });
    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (existing.status === PaymentStatus.PAID) {
      throw new ConflictException(
        'Não é possível editar uma nota já recebida; estorne o recebimento antes',
      );
    }
    if (dto.projectId === null || !(dto.projectId ?? existing.projectId)) {
      throw new BadRequestException('Obra é obrigatória');
    }
    if (dto.number === null || !(dto.number ?? existing.number)) {
      throw new BadRequestException('Número da nota é obrigatório');
    }

    const withholdings =
      dto.withholdings ??
      existing.withholdings.map((withholding) => ({
        type: withholding.type,
        amount: withholding.amount.toString(),
      }));
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
      const receivable = await this.prisma.receivable.update({
        where: { id },
        data: {
          number: dto.number,
          description: dto.description,
          clientName: dto.clientName,
          grossAmount,
          netAmount,
          amount: netAmount,
          competence: dto.competence
            ? this.competenceDate(dto.competence)
            : undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          companyId: dto.companyId,
          projectId: dto.projectId,
          withholdings: dto.withholdings
            ? {
                deleteMany: {},
                create: this.withholdingRows(dto.withholdings),
              }
            : undefined,
        },
        include: receivableInclude,
      });
      return this.toResponse(receivable);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async registerReceipt(id: string, dto: ReceiveReceivableDto) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
    });
    if (!receivable) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (receivable.status === PaymentStatus.PAID) {
      throw new ConflictException('Esta nota já foi recebida');
    }

    const updated = await this.prisma.receivable.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        receiptDate: new Date(dto.receiptDate),
      },
      include: receivableInclude,
    });
    return this.toResponse(updated);
  }

  async removeReceipt(id: string) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
    });
    if (!receivable) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (receivable.status !== PaymentStatus.PAID) {
      throw new ConflictException(
        'Esta nota não possui recebimento registrado',
      );
    }

    const updated = await this.prisma.receivable.update({
      where: { id },
      data: { status: PaymentStatus.PENDING, receiptDate: null },
      include: receivableInclude,
    });
    return this.toResponse(updated);
  }

  async remove(id: string) {
    try {
      await this.prisma.receivable.delete({ where: { id } });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private toResponse(receivable: ReceivableWithRelations) {
    const effectiveStatus =
      receivable.status === PaymentStatus.PAID
        ? BillStatusFilter.PAID
        : receivable.dueDate < startOfTodayUtc()
          ? BillStatusFilter.OVERDUE
          : BillStatusFilter.PENDING;
    return {
      ...receivable,
      withholdingTotal: receivable.grossAmount
        .minus(receivable.netAmount)
        .toFixed(2),
      effectiveStatus,
    };
  }

  private competenceDate(competence: string) {
    return new Date(`${competence}-01T00:00:00.000Z`);
  }

  private withholdingRows(withholdings: ReceivableWithholdingDto[]) {
    return withholdings.map((withholding) => ({
      type: withholding.type,
      amount: new Prisma.Decimal(withholding.amount),
    }));
  }

  private computeNetAmount(
    grossAmount: Prisma.Decimal,
    withholdings: Pick<ReceivableWithholdingDto, 'type' | 'amount'>[],
  ) {
    const types = withholdings.map((withholding) => withholding.type);
    if (new Set(types).size !== types.length) {
      throw new BadRequestException(
        'Não é possível informar mais de uma retenção do mesmo tipo',
      );
    }
    const total = withholdings.reduce(
      (acc, withholding) =>
        acc.plus(
          this.toPositiveDecimal(
            withholding.amount,
            'Valor da retenção deve ser maior que zero',
          ),
        ),
      new Prisma.Decimal(0),
    );
    if (total.gte(grossAmount)) {
      throw new BadRequestException(
        'A soma das retenções deve ser menor que o valor bruto',
      );
    }
    return grossAmount.minus(total);
  }

  private toPositiveDecimal(value: string, message: string) {
    const decimal = new Prisma.Decimal(value);
    if (decimal.lte(0)) {
      throw new BadRequestException(message);
    }
    return decimal;
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
      if (error.code === 'P2002') {
        return new ConflictException(
          'Já existe uma nota com esse número nesta empresa',
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
        return new BadRequestException('Registro relacionado não existe');
      }
      if (error.code === 'P2025') {
        return new NotFoundException(NOT_FOUND);
      }
    }
    return error;
  }
}
