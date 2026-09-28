import { Injectable } from '@nestjs/common';
import { Prisma, TaxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CashflowRegime } from '../bill/dto/list-bills-query.dto';
import { billEffectiveDate, billPeriodWhere } from '../common/bill-period.util';
import { monthRange, resolveReportMonths } from '../common/period.util';
import { receivablePeriodWhere } from '../common/receivable-period.util';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

type Totals = Map<TaxType, Prisma.Decimal>;

type Group = {
  id: string | null;
  invoiceCount: number;
  total: Prisma.Decimal;
  byType: Totals;
};

const zero = () => new Prisma.Decimal(0);

function addTo(group: Group, type: TaxType, amount: Prisma.Decimal) {
  group.byType.set(type, (group.byType.get(type) ?? zero()).plus(amount));
  group.total = group.total.plus(amount);
}

function serializeByType(byType: Totals) {
  return Object.values(TaxType)
    .filter((type) => byType.has(type))
    .map((type) => ({
      type,
      amount: (byType.get(type) as Prisma.Decimal).toFixed(2),
    }));
}

function amountsByType(
  withholdings: { type: TaxType; amount: Prisma.Decimal }[],
) {
  return Object.fromEntries(
    Object.values(TaxType).map((type) => [
      type,
      withholdings
        .filter((withholding) => withholding.type === type)
        .reduce((acc, withholding) => acc.plus(withholding.amount), zero())
        .toFixed(2),
    ]),
  ) as Record<TaxType, string>;
}

@Injectable()
export class WithholdingService {
  constructor(private readonly prisma: PrismaService) {}

  async build(query: ReportPeriodQueryDto) {
    resolveReportMonths(query.from, query.to);
    const start = monthRange(query.from).start;
    const end = monthRange(query.to).end;
    const regime = query.regime ?? CashflowRegime.ACCRUAL;

    const invoices = await this.prisma.receivable.findMany({
      where: {
        AND: [
          { withholdings: { some: {} } },
          receivablePeriodWhere(start, end, regime),
          query.companyId ? { companyId: query.companyId } : {},
          query.projectId ? { projectId: query.projectId } : {},
        ],
      },
      include: {
        company: { select: { id: true, legalName: true, cnpj: true } },
        project: { select: { id: true, name: true } },
        withholdings: { select: { type: true, amount: true } },
      },
      orderBy: [{ competence: 'asc' }, { number: 'asc' }],
    });

    const companies = new Map<
      string,
      Group & { legalName: string; cnpj: string }
    >();
    const projects = new Map<string, Group & { name: string }>();
    const overall: Group = {
      id: null,
      invoiceCount: 0,
      total: zero(),
      byType: new Map(),
    };
    let grossTotal = zero();
    let netTotal = zero();

    for (const invoice of invoices) {
      const company = companies.get(invoice.company.id) ?? {
        id: invoice.company.id,
        legalName: invoice.company.legalName,
        cnpj: invoice.company.cnpj,
        invoiceCount: 0,
        total: zero(),
        byType: new Map(),
      };
      const projectKey = invoice.project?.id ?? '';
      const project = projects.get(projectKey) ?? {
        id: invoice.project?.id ?? null,
        name: invoice.project?.name ?? 'Sem obra (lançamentos anteriores)',
        invoiceCount: 0,
        total: zero(),
        byType: new Map(),
      };

      for (const group of [company, project, overall]) {
        group.invoiceCount += 1;
      }
      for (const withholding of invoice.withholdings) {
        for (const group of [company, project, overall]) {
          addTo(group, withholding.type, withholding.amount);
        }
      }
      grossTotal = grossTotal.plus(invoice.grossAmount);
      netTotal = netTotal.plus(invoice.netAmount);
      companies.set(invoice.company.id, company);
      projects.set(projectKey, project);
    }

    const serializeGroup = (group: Group) => ({
      invoiceCount: group.invoiceCount,
      total: group.total.toFixed(2),
      byType: serializeByType(group.byType),
    });

    return {
      regime,
      from: query.from,
      to: query.to,
      consolidated: !query.companyId,
      companies: [...companies.values()]
        .sort((a, b) => a.legalName.localeCompare(b.legalName, 'pt-BR'))
        .map((company) => ({
          companyId: company.id,
          legalName: company.legalName,
          cnpj: company.cnpj,
          ...serializeGroup(company),
        })),
      projects: [...projects.values()]
        .sort((a, b) => b.total.comparedTo(a.total))
        .map((project) => ({
          projectId: project.id,
          name: project.name,
          ...serializeGroup(project),
        })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        companyId: invoice.company.id,
        legalName: invoice.company.legalName,
        cnpj: invoice.company.cnpj,
        projectId: invoice.project?.id ?? null,
        projectName: invoice.project?.name ?? null,
        clientName: invoice.clientName,
        competence: invoice.competence,
        issueDate: invoice.issueDate,
        receiptDate: invoice.receiptDate,
        grossAmount: invoice.grossAmount.toFixed(2),
        withholdingTotal: invoice.grossAmount
          .minus(invoice.netAmount)
          .toFixed(2),
        netAmount: invoice.netAmount.toFixed(2),
        amountsByType: amountsByType(invoice.withholdings),
      })),
      totals: {
        ...serializeGroup(overall),
        grossAmount: grossTotal.toFixed(2),
        netAmount: netTotal.toFixed(2),
      },
      legacy: await this.legacyBills(start, end, regime, query),
    };
  }

  private async legacyBills(
    start: Date,
    end: Date,
    regime: CashflowRegime,
    query: ReportPeriodQueryDto,
  ) {
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
        supplier: { select: { name: true } },
        invoice: { select: { dueDate: true, paymentDate: true } },
        taxWithholdings: { select: { type: true, amount: true } },
      },
      orderBy: { issueDate: 'asc' },
    });

    const overall: Group = {
      id: null,
      invoiceCount: 0,
      total: zero(),
      byType: new Map(),
    };
    for (const bill of bills) {
      for (const withholding of bill.taxWithholdings) {
        addTo(overall, withholding.type, withholding.amount);
      }
    }

    return {
      bills: bills.map((bill) => ({
        id: bill.id,
        documentNumber: bill.documentNumber,
        companyId: bill.company.id,
        legalName: bill.company.legalName,
        cnpj: bill.company.cnpj,
        supplierName: bill.supplier.name,
        referenceDate: billEffectiveDate(bill, regime),
        grossAmount: bill.grossAmount.toFixed(2),
        withholdingTotal: bill.grossAmount.minus(bill.netAmount).toFixed(2),
        netAmount: bill.netAmount.toFixed(2),
        amountsByType: amountsByType(bill.taxWithholdings),
      })),
      totals: {
        billCount: bills.length,
        total: overall.total.toFixed(2),
        byType: serializeByType(overall.byType),
      },
    };
  }
}
