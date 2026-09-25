import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  billDateBasisWhere,
  billPeriodWhere,
} from '../common/bill-period.util';
import {
  digitableLineError,
  normalizeDigitableLine,
} from '../common/digitable-line.util';
import { monthRange, startOfTodayUtc } from '../common/period.util';
import { CreateBillDto } from './dto/create-bill.dto';
import { CreateInstallmentsDto } from './dto/create-installments.dto';
import {
  BillStatusFilter,
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
  group: {
    include: {
      bills: {
        select: {
          id: true,
          netAmount: true,
          status: true,
          invoice: { select: { status: true } },
        },
        orderBy: { installmentNumber: 'asc' },
      },
    },
  },
} satisfies Prisma.BillInclude;

type BillWithRelations = Prisma.BillGetPayload<{ include: typeof billInclude }>;
type GroupMember = NonNullable<BillWithRelations['group']>['bills'][number];

const LEGACY_AMOUNT_LOCKED =
  'Esta conta tem retenções do modelo anterior; o valor não pode ser alterado';

@Injectable()
export class BillService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBillDto) {
    const amount = this.toPositiveDecimal(
      dto.amount,
      'Valor deve ser maior que zero',
    );
    this.assertDateOrder(dto.issueDate, dto.dueDate);
    const digitableLine = this.digitableLineValue(dto.digitableLine) ?? null;

    try {
      const bill = await this.prisma.bill.create({
        data: {
          documentNumber: this.documentNumberFor(dto.description),
          description: dto.description,
          digitableLine,
          grossAmount: amount,
          netAmount: amount,
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          hasTaxWithholding: false,
          companyId: dto.companyId,
          projectId: dto.projectId ?? null,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
        },
        include: billInclude,
      });
      return this.toResponse(bill);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async createInstallments(dto: CreateInstallmentsDto) {
    const total = this.toPositiveDecimal(
      dto.totalAmount,
      'Valor total deve ser maior que zero',
    );
    this.assertUniqueLabels(dto.installments.map((item) => item.label));

    const installments = dto.installments.map((item) => {
      const prefix = `Boleto ${item.label}: `;
      const amount = this.toPositiveDecimal(
        item.amount,
        `${prefix}valor deve ser maior que zero`,
      );
      if (new Date(item.dueDate) < new Date(dto.issueDate)) {
        throw new BadRequestException(
          `${prefix}vencimento não pode ser anterior à data da compra`,
        );
      }
      return {
        ...item,
        amount,
        digitableLine: this.digitableLineValue(item.digitableLine, prefix),
      };
    });

    const sum = installments.reduce(
      (acc, item) => acc.plus(item.amount),
      new Prisma.Decimal(0),
    );
    if (!sum.equals(total)) {
      throw new BadRequestException(
        `A soma dos boletos (${sum.toFixed(2)}) é diferente do valor total (${total.toFixed(2)})`,
      );
    }

    try {
      const groupId = await this.prisma.$transaction(async (tx) => {
        const group = await tx.billGroup.create({ data: {} });
        await tx.bill.createMany({
          data: installments.map((item, index) => ({
            documentNumber: this.documentNumberFor(dto.description, item.label),
            description: dto.description,
            digitableLine: item.digitableLine ?? null,
            installmentLabel: item.label,
            installmentNumber: index + 1,
            grossAmount: item.amount,
            netAmount: item.amount,
            issueDate: new Date(dto.issueDate),
            dueDate: new Date(item.dueDate),
            hasTaxWithholding: false,
            companyId: dto.companyId,
            projectId: dto.projectId ?? null,
            categoryId: dto.categoryId,
            supplierId: dto.supplierId,
            groupId: group.id,
          })),
        });
        return group.id;
      });

      const bills = await this.prisma.bill.findMany({
        where: { groupId },
        include: billInclude,
        orderBy: { installmentNumber: 'asc' },
      });
      return bills.map((bill) => this.toResponse(bill));
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async findAll(query: ListBillsQueryDto) {
    if (query.regime && query.dateBasis) {
      throw new BadRequestException(
        'Informe regime ou dateBasis, não os dois ao mesmo tempo',
      );
    }

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
      const { start, end } = monthRange(query.month);
      filters.push(
        query.dateBasis
          ? billDateBasisWhere(start, end, query.dateBasis)
          : billPeriodWhere(start, end, query.regime),
      );
    }

    const bills = await this.prisma.bill.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: billInclude,
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
    });
    return bills.map((bill) => this.toResponse(bill));
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

  async findOne(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: billInclude,
    });
    if (!bill) {
      throw new NotFoundException('Conta não encontrada');
    }
    return this.toResponse(bill);
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

    const amount =
      dto.amount === undefined
        ? undefined
        : this.toPositiveDecimal(dto.amount, 'Valor deve ser maior que zero');
    if (
      amount &&
      existing.taxWithholdings.length > 0 &&
      !amount.equals(existing.netAmount)
    ) {
      throw new ConflictException(LEGACY_AMOUNT_LOCKED);
    }
    const amountChanges =
      amount && existing.taxWithholdings.length === 0
        ? { grossAmount: amount, netAmount: amount }
        : {};

    this.assertDateOrder(
      dto.issueDate ?? existing.issueDate,
      dto.dueDate ?? existing.dueDate,
    );

    try {
      const bill = await this.prisma.bill.update({
        where: { id },
        data: {
          ...amountChanges,
          description: dto.description,
          documentNumber: dto.description
            ? this.documentNumberFor(dto.description, existing.installmentLabel)
            : undefined,
          digitableLine: this.digitableLineValue(dto.digitableLine),
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          companyId: dto.companyId,
          projectId: dto.projectId,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
        },
        include: billInclude,
      });
      return this.toResponse(bill);
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
    return this.toResponse(updated);
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
    return this.toResponse(updated);
  }

  async remove(id: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const bill = await tx.bill.delete({ where: { id } });
        if (
          bill.groupId &&
          (await tx.bill.count({ where: { groupId: bill.groupId } })) === 0
        ) {
          await tx.billGroup.delete({ where: { id: bill.groupId } });
        }
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async removeGroup(groupId: string) {
    const group = await this.prisma.billGroup.findUnique({
      where: { id: groupId },
      include: { bills: { include: { invoice: true } } },
    });
    if (!group) {
      throw new NotFoundException('Grupo de boletos não encontrado');
    }
    if (group.bills.some((bill) => this.isPaid(bill))) {
      throw new ConflictException(
        'Não é possível excluir o grupo: há boletos pagos. Estorne os pagamentos antes',
      );
    }

    await this.prisma.$transaction([
      this.prisma.bill.deleteMany({ where: { groupId } }),
      this.prisma.billGroup.delete({ where: { id: groupId } }),
    ]);
  }

  private toResponse(bill: BillWithRelations) {
    const { group, ...rest } = bill;
    const status = bill.invoice ? bill.invoice.status : bill.status;
    const dueDate = bill.invoice ? bill.invoice.dueDate : bill.dueDate;
    const effectiveStatus =
      status === PaymentStatus.PAID
        ? BillStatusFilter.PAID
        : dueDate < startOfTodayUtc()
          ? BillStatusFilter.OVERDUE
          : BillStatusFilter.PENDING;
    return {
      ...rest,
      effectiveStatus,
      effectiveDueDate: dueDate,
      group: group ? this.summarizeGroup(bill.id, group.id, group.bills) : null,
    };
  }

  private summarizeGroup(
    billId: string,
    groupId: string,
    members: GroupMember[],
  ) {
    return {
      id: groupId,
      position: members.findIndex((member) => member.id === billId) + 1,
      billCount: members.length,
      paidCount: members.filter((member) => this.isPaid(member)).length,
      totalAmount: members
        .reduce(
          (acc, member) => acc.plus(member.netAmount),
          new Prisma.Decimal(0),
        )
        .toFixed(2),
    };
  }

  private isPaid(bill: {
    status: PaymentStatus;
    invoice: { status: PaymentStatus } | null;
  }) {
    return (
      (bill.invoice ? bill.invoice.status : bill.status) === PaymentStatus.PAID
    );
  }

  private documentNumberFor(description: string, label?: string | null) {
    return label ? `${description} · ${label}` : description;
  }

  private digitableLineValue(value: string | null | undefined, prefix = '') {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value.trim() === '') {
      return null;
    }
    const error = digitableLineError(value);
    if (error) {
      throw new BadRequestException(`${prefix}${error}`);
    }
    return normalizeDigitableLine(value);
  }

  private assertUniqueLabels(labels: string[]) {
    const seen = new Set<string>();
    for (const label of labels) {
      const key = label.toLocaleUpperCase('pt-BR');
      if (seen.has(key)) {
        throw new BadRequestException(
          `Rótulo de boleto repetido no grupo: ${label}`,
        );
      }
      seen.add(key);
    }
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
        'Data de vencimento não pode ser anterior à data da compra',
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
