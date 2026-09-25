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
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { ListReceivablesQueryDto } from './dto/list-receivables-query.dto';
import { ReceiveReceivableDto } from './dto/receive-receivable.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';

const receivableInclude = {
  company: true,
  project: true,
} satisfies Prisma.ReceivableInclude;

type ReceivableWithRelations = Prisma.ReceivableGetPayload<{
  include: typeof receivableInclude;
}>;

@Injectable()
export class ReceivableService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReceivableDto) {
    const amount = this.toPositiveDecimal(dto.amount);
    this.assertDateOrder(dto.issueDate, dto.dueDate);

    try {
      const receivable = await this.prisma.receivable.create({
        data: {
          description: dto.description,
          clientName: dto.clientName,
          amount,
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          companyId: dto.companyId,
          projectId: dto.projectId ?? null,
        },
        include: receivableInclude,
      });
      return this.withEffectiveStatus(receivable);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async findAll(query: ListReceivablesQueryDto) {
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
      filters.push(
        query.regime === CashflowRegime.CASH
          ? { receiptDate: { gte: start, lt: end } }
          : { issueDate: { gte: start, lt: end } },
      );
    }

    const receivables = await this.prisma.receivable.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: receivableInclude,
      orderBy: { dueDate: 'asc' },
    });
    return receivables.map((receivable) =>
      this.withEffectiveStatus(receivable),
    );
  }

  async findOne(id: string) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
      include: receivableInclude,
    });
    if (!receivable) {
      throw new NotFoundException('Recebível não encontrado');
    }
    return this.withEffectiveStatus(receivable);
  }

  async update(id: string, dto: UpdateReceivableDto) {
    const existing = await this.prisma.receivable.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Recebível não encontrado');
    }
    if (existing.status === PaymentStatus.PAID) {
      throw new ConflictException(
        'Não é possível editar um recebível já recebido; estorne o recebimento antes',
      );
    }
    this.assertDateOrder(
      dto.issueDate ?? existing.issueDate,
      dto.dueDate ?? existing.dueDate,
    );

    try {
      const receivable = await this.prisma.receivable.update({
        where: { id },
        data: {
          description: dto.description,
          clientName: dto.clientName,
          amount: dto.amount ? this.toPositiveDecimal(dto.amount) : undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          companyId: dto.companyId,
          projectId: dto.projectId,
        },
        include: receivableInclude,
      });
      return this.withEffectiveStatus(receivable);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async registerReceipt(id: string, dto: ReceiveReceivableDto) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
    });
    if (!receivable) {
      throw new NotFoundException('Recebível não encontrado');
    }
    if (receivable.status === PaymentStatus.PAID) {
      throw new ConflictException('Este recebível já foi recebido');
    }

    const updated = await this.prisma.receivable.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        receiptDate: new Date(dto.receiptDate),
      },
      include: receivableInclude,
    });
    return this.withEffectiveStatus(updated);
  }

  async removeReceipt(id: string) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
    });
    if (!receivable) {
      throw new NotFoundException('Recebível não encontrado');
    }
    if (receivable.status !== PaymentStatus.PAID) {
      throw new ConflictException(
        'Este recebível não possui recebimento registrado',
      );
    }

    const updated = await this.prisma.receivable.update({
      where: { id },
      data: { status: PaymentStatus.PENDING, receiptDate: null },
      include: receivableInclude,
    });
    return this.withEffectiveStatus(updated);
  }

  async remove(id: string) {
    try {
      await this.prisma.receivable.delete({ where: { id } });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private withEffectiveStatus(receivable: ReceivableWithRelations) {
    const effectiveStatus =
      receivable.status === PaymentStatus.PAID
        ? BillStatusFilter.PAID
        : receivable.dueDate < startOfTodayUtc()
          ? BillStatusFilter.OVERDUE
          : BillStatusFilter.PENDING;
    return { ...receivable, effectiveStatus };
  }

  private toPositiveDecimal(value: string) {
    const decimal = new Prisma.Decimal(value);
    if (decimal.lte(0)) {
      throw new BadRequestException('Valor deve ser maior que zero');
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
        return new NotFoundException('Recebível não encontrado');
      }
    }
    return error;
  }
}
