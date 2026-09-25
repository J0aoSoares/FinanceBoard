import { Injectable } from '@nestjs/common';
import { Prisma, TaxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CashflowRegime } from '../bill/dto/list-bills-query.dto';
import { billEffectiveDate, billPeriodWhere } from '../common/bill-period.util';
import { monthRange, resolveReportMonths } from '../common/period.util';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

@Injectable()
export class WithholdingService {
  constructor(private readonly prisma: PrismaService) {}

  async build(query: ReportPeriodQueryDto) {
    resolveReportMonths(query.from, query.to);
    const start = monthRange(query.from).start;
    const end = monthRange(query.to).end;
    const regime = query.regime ?? CashflowRegime.ACCRUAL;

    const bills = await this.prisma.bill.findMany({
      where: {
        AND: [
          { hasTaxWithholding: true },
          billPeriodWhere(start, end, regime),
          query.companyId ? { companyId: query.companyId } : {},
          query.projectId ? { projectId: query.projectId } : {},
        ],
      },
      select: {
        id: true,
        documentNumber: true,
        grossAmount: true,
        netAmount: true,
        issueDate: true,
        paymentDate: true,
        company: { select: { id: true, legalName: true, cnpj: true } },
        supplier: { select: { id: true, name: true } },
        invoice: { select: { dueDate: true, paymentDate: true } },
        taxWithholdings: { select: { type: true, amount: true } },
      },
      orderBy: { issueDate: 'asc' },
    });

    const byCompany = new Map<
      string,
      {
        companyId: string;
        legalName: string;
        cnpj: string;
        byType: Map<TaxType, Prisma.Decimal>;
        total: Prisma.Decimal;
        billCount: number;
      }
    >();
    const overallByType = new Map<TaxType, Prisma.Decimal>();
    let overallTotal = new Prisma.Decimal(0);

    for (const bill of bills) {
      const entry = byCompany.get(bill.company.id) ?? {
        companyId: bill.company.id,
        legalName: bill.company.legalName,
        cnpj: bill.company.cnpj,
        byType: new Map<TaxType, Prisma.Decimal>(),
        total: new Prisma.Decimal(0),
        billCount: 0,
      };
      entry.billCount += 1;

      for (const withholding of bill.taxWithholdings) {
        const current =
          entry.byType.get(withholding.type) ?? new Prisma.Decimal(0);
        entry.byType.set(withholding.type, current.plus(withholding.amount));
        entry.total = entry.total.plus(withholding.amount);

        const overall =
          overallByType.get(withholding.type) ?? new Prisma.Decimal(0);
        overallByType.set(withholding.type, overall.plus(withholding.amount));
        overallTotal = overallTotal.plus(withholding.amount);
      }

      byCompany.set(bill.company.id, entry);
    }

    return {
      regime,
      from: query.from,
      to: query.to,
      consolidated: !query.companyId,
      companies: [...byCompany.values()]
        .sort((a, b) => a.legalName.localeCompare(b.legalName, 'pt-BR'))
        .map((entry) => ({
          companyId: entry.companyId,
          legalName: entry.legalName,
          cnpj: entry.cnpj,
          billCount: entry.billCount,
          total: entry.total.toFixed(2),
          byType: this.serializeByType(entry.byType),
        })),
      bills: bills.map((bill) => ({
        id: bill.id,
        documentNumber: bill.documentNumber,
        companyId: bill.company.id,
        supplierName: bill.supplier.name,
        referenceDate: billEffectiveDate(bill, regime),
        grossAmount: bill.grossAmount.toFixed(2),
        netAmount: bill.netAmount.toFixed(2),
        withholdingTotal: bill.grossAmount.minus(bill.netAmount).toFixed(2),
        withholdings: bill.taxWithholdings.map((withholding) => ({
          type: withholding.type,
          amount: withholding.amount.toFixed(2),
        })),
      })),
      totals: {
        billCount: bills.length,
        total: overallTotal.toFixed(2),
        byType: this.serializeByType(overallByType),
      },
    };
  }

  private serializeByType(byType: Map<TaxType, Prisma.Decimal>) {
    return Object.values(TaxType)
      .filter((type) => byType.has(type))
      .map((type) => ({
        type,
        amount: (byType.get(type) as Prisma.Decimal).toFixed(2),
      }));
  }
}
