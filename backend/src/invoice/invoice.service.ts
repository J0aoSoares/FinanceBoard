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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const invoiceInclude = {
  company: true,
  supplier: true,
  bills: {
    include: {
      project: true,
      category: true,
      supplier: true,
      taxWithholdings: true,
    },
    orderBy: { issueDate: 'asc' },
  },
} satisfies Prisma.InvoiceInclude;

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
    const invoice = await this.prisma.$transaction(async (tx) => {
      await this.assertBillsAreAvailable(tx, dto.billIds, dto.companyId);

      const created = await tx.invoice.create({
        data: {
          number: dto.number,
          companyId: dto.companyId,
          supplierId: dto.supplierId ?? null,
          dueDate: new Date(dto.dueDate),
        },
      });

      await tx.bill.updateMany({
        where: { id: { in: dto.billIds } },
        data: { invoiceId: created.id },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id: created.id },
        include: invoiceInclude,
      });
    });

    return this.withTotals(invoice);
  }

  async findAll(query: ListInvoicesQueryDto) {
    const filters: Prisma.InvoiceWhereInput[] = [];

    if (query.companyId) {
      filters.push({ companyId: query.companyId });
    }
    if (query.supplierId) {
      filters.push({ supplierId: query.supplierId });
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
          ? { paymentDate: { gte: start, lt: end } }
          : { dueDate: { gte: start, lt: end } },
      );
    }

    const invoices = await this.prisma.invoice.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: invoiceInclude,
      orderBy: { dueDate: 'asc' },
    });
    return invoices.map((invoice) => this.withTotals(invoice));
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });
    if (!invoice) {
      throw new NotFoundException('Fatura não encontrada');
    }
    return this.withTotals(invoice);
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Fatura não encontrada');
      }
      if (existing.status === PaymentStatus.PAID) {
        throw new ConflictException(
          'Não é possível editar uma fatura já paga; estorne o pagamento antes',
        );
      }

      if (dto.billIds) {
        await this.assertBillsAreAvailable(
          tx,
          dto.billIds,
          existing.companyId,
          id,
        );
        await tx.bill.updateMany({
          where: { invoiceId: id },
          data: { invoiceId: null },
        });
        await tx.bill.updateMany({
          where: { id: { in: dto.billIds } },
          data: { invoiceId: id },
        });
      }

      await tx.invoice.update({
        where: { id },
        data: {
          number: dto.number,
          supplierId: dto.supplierId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id },
        include: invoiceInclude,
      });
    });

    return this.withTotals(invoice);
  }

  async registerPayment(id: string, dto: PayInvoiceDto) {
    const paymentDate = new Date(dto.paymentDate);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Fatura não encontrada');
      }
      if (existing.status === PaymentStatus.PAID) {
        throw new ConflictException('Esta fatura já está paga');
      }

      await tx.invoice.update({
        where: { id },
        data: { status: PaymentStatus.PAID, paymentDate },
      });
      await tx.bill.updateMany({
        where: { invoiceId: id },
        data: { status: PaymentStatus.PAID, paymentDate },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id },
        include: invoiceInclude,
      });
    });

    return this.withTotals(invoice);
  }

  async removePayment(id: string) {
    const invoice = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Fatura não encontrada');
      }
      if (existing.status !== PaymentStatus.PAID) {
        throw new ConflictException(
          'Esta fatura não possui pagamento registrado',
        );
      }

      await tx.invoice.update({
        where: { id },
        data: { status: PaymentStatus.PENDING, paymentDate: null },
      });
      await tx.bill.updateMany({
        where: { invoiceId: id },
        data: { status: PaymentStatus.PENDING, paymentDate: null },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id },
        include: invoiceInclude,
      });
    });

    return this.withTotals(invoice);
  }

  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Fatura não encontrada');
      }
      if (existing.status === PaymentStatus.PAID) {
        throw new ConflictException(
          'Não é possível remover uma fatura já paga; estorne o pagamento antes',
        );
      }

      await tx.bill.updateMany({
        where: { invoiceId: id },
        data: { invoiceId: null },
      });
      await tx.invoice.delete({ where: { id } });
    });
  }

  private async assertBillsAreAvailable(
    tx: Prisma.TransactionClient,
    billIds: string[],
    companyId: string,
    currentInvoiceId?: string,
  ) {
    const uniqueIds = [...new Set(billIds)];
    if (uniqueIds.length !== billIds.length) {
      throw new BadRequestException(
        'A mesma conta foi informada mais de uma vez',
      );
    }

    const bills = await tx.bill.findMany({ where: { id: { in: uniqueIds } } });
    if (bills.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Uma ou mais contas informadas não existem',
      );
    }

    const fromAnotherCompany = bills.some(
      (bill) => bill.companyId !== companyId,
    );
    if (fromAnotherCompany) {
      throw new BadRequestException(
        'Todas as contas da fatura devem pertencer à mesma empresa da fatura',
      );
    }

    const alreadyInvoiced = bills.filter(
      (bill) => bill.invoiceId !== null && bill.invoiceId !== currentInvoiceId,
    );
    if (alreadyInvoiced.length > 0) {
      throw new ConflictException(
        'Uma ou mais contas já pertencem a outra fatura',
      );
    }

    const alreadyPaid = bills.filter(
      (bill) => bill.status === PaymentStatus.PAID && bill.invoiceId === null,
    );
    if (alreadyPaid.length > 0) {
      throw new ConflictException(
        'Não é possível faturar uma conta que já foi paga',
      );
    }
  }

  private withTotals(invoice: InvoiceWithRelations) {
    const grossTotal = invoice.bills.reduce(
      (acc, bill) => acc.plus(bill.grossAmount),
      new Prisma.Decimal(0),
    );
    const netTotal = invoice.bills.reduce(
      (acc, bill) => acc.plus(bill.netAmount),
      new Prisma.Decimal(0),
    );

    return {
      ...invoice,
      effectiveStatus: this.effectiveStatus(invoice),
      billCount: invoice.bills.length,
      grossTotal: grossTotal.toFixed(2),
      withholdingTotal: grossTotal.minus(netTotal).toFixed(2),
      netTotal: netTotal.toFixed(2),
    };
  }

  private effectiveStatus(invoice: InvoiceWithRelations) {
    if (invoice.status === PaymentStatus.PAID) {
      return BillStatusFilter.PAID;
    }
    return invoice.dueDate < startOfTodayUtc()
      ? BillStatusFilter.OVERDUE
      : BillStatusFilter.PENDING;
  }
}
