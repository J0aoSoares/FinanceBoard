import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CashflowRegime } from '../bill/dto/list-bills-query.dto';
import { billPeriodWhere } from '../common/bill-period.util';
import { monthRange, resolveReportMonths } from '../common/period.util';
import {
  receivablePeriodWhere,
  receivedWithinWhere,
} from '../common/receivable-period.util';
import {
  projectBillingPeriodWhere,
  retainageReleaseWithinWhere,
} from '../common/project-billing-period.util';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

const zero = () => new Prisma.Decimal(0);

type Revenue = {
  invoiceCount: number;
  gross: Prisma.Decimal;
  net: Prisma.Decimal;
  outstanding: Prisma.Decimal;
};

type Cost = {
  billCount: number;
  total: Prisma.Decimal;
  byCategory: Map<
    string,
    { name: string; billCount: number; total: Prisma.Decimal }
  >;
};

type Retainage = {
  withheld: Prisma.Decimal;
  released: Prisma.Decimal;
  balance: Prisma.Decimal;
};

type Entry = {
  projectId: string | null;
  name: string;
  clientName: string | null;
  status: ProjectStatus | null;
  revenue: Revenue;
  received: Prisma.Decimal;
  cost: Cost;
  retainage: Retainage;
};

type ProjectInfo = {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
} | null;

const emptyRevenue = (): Revenue => ({
  invoiceCount: 0,
  gross: zero(),
  net: zero(),
  outstanding: zero(),
});

const emptyCost = (): Cost => ({
  billCount: 0,
  total: zero(),
  byCategory: new Map(),
});

const serializeRevenue = (revenue: Revenue) => ({
  invoiceCount: revenue.invoiceCount,
  grossAmount: revenue.gross.toFixed(2),
  withholdingTotal: revenue.gross.minus(revenue.net).toFixed(2),
  netAmount: revenue.net.toFixed(2),
});

const emptyRetainage = (): Retainage => ({
  withheld: zero(),
  released: zero(),
  balance: zero(),
});

const serializeRetainage = (retainage: Retainage) => ({
  withheld: retainage.withheld.toFixed(2),
  released: retainage.released.toFixed(2),
  balance: retainage.balance.toFixed(2),
});

const serializeCost = (cost: Cost) => ({
  billCount: cost.billCount,
  total: cost.total.toFixed(2),
  byCategory: [...cost.byCategory.entries()]
    .sort((a, b) => b[1].total.comparedTo(a[1].total))
    .map(([categoryId, category]) => ({
      categoryId,
      name: category.name,
      billCount: category.billCount,
      total: category.total.toFixed(2),
    })),
});

@Injectable()
export class ProjectResultService {
  constructor(private readonly prisma: PrismaService) {}

  async build(query: ReportPeriodQueryDto) {
    resolveReportMonths(query.from, query.to);
    const start = monthRange(query.from).start;
    const end = monthRange(query.to).end;
    const regime = query.regime ?? CashflowRegime.ACCRUAL;
    const scope: Prisma.ReceivableWhereInput[] = [
      query.companyId ? { companyId: query.companyId } : {},
      query.projectId ? { projectId: query.projectId } : {},
    ];
    const project = {
      select: { id: true, name: true, clientName: true, status: true },
    };

    const [issued, received, bills] = await Promise.all([
      this.prisma.receivable.findMany({
        where: { AND: [receivablePeriodWhere(start, end, regime), ...scope] },
        select: {
          grossAmount: true,
          netAmount: true,
          status: true,
          project,
        },
      }),
      this.prisma.receivable.findMany({
        where: {
          AND: [
            receivedWithinWhere(start, end),
            { status: PaymentStatus.PAID },
            ...scope,
          ],
        },
        select: { netAmount: true, project },
      }),
      this.prisma.bill.findMany({
        where: {
          AND: [
            billPeriodWhere(start, end, regime),
            query.companyId ? { companyId: query.companyId } : {},
            query.projectId ? { projectId: query.projectId } : {},
          ],
        },
        select: {
          grossAmount: true,
          project,
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    const billingScope: Prisma.ProjectBillingWhereInput[] = [
      query.companyId ? { companyId: query.companyId } : {},
      query.projectId ? { projectId: query.projectId } : {},
    ];
    const releaseScope: Prisma.RetainageReleaseWhereInput[] = [
      query.companyId ? { companyId: query.companyId } : {},
      query.projectId ? { projectId: query.projectId } : {},
    ];
    const [
      billingsIssued,
      billingsPaid,
      releasesInPeriod,
      billingsUntilEnd,
      releasesUntilEnd,
    ] = await Promise.all([
      this.prisma.projectBilling.findMany({
        where: {
          AND: [projectBillingPeriodWhere(start, end, regime), ...billingScope],
        },
        select: {
          amount: true,
          retainageAmount: true,
          netAmount: true,
          paymentDate: true,
          project,
        },
      }),
      this.prisma.projectBilling.findMany({
        where: {
          AND: [{ paymentDate: { gte: start, lt: end } }, ...billingScope],
        },
        select: { netAmount: true, project },
      }),
      this.prisma.retainageRelease.findMany({
        where: {
          AND: [retainageReleaseWithinWhere(start, end), ...releaseScope],
        },
        select: { amount: true, project },
      }),
      this.prisma.projectBilling.findMany({
        where: { AND: [{ dueDate: { lt: end } }, ...billingScope] },
        select: { retainageAmount: true, project },
      }),
      this.prisma.retainageRelease.findMany({
        where: { AND: [{ returnDate: { lt: end } }, ...releaseScope] },
        select: { amount: true, project },
      }),
    ]);

    const projects = new Map<string, Entry>();
    const unassigned: Entry = this.newEntry(null);
    const administrative = emptyCost();
    const entryFor = (info: ProjectInfo) => {
      if (!info) {
        return unassigned;
      }
      const entry = projects.get(info.id) ?? this.newEntry(info);
      projects.set(info.id, entry);
      return entry;
    };

    for (const invoice of issued) {
      const { revenue } = entryFor(invoice.project);
      revenue.invoiceCount += 1;
      revenue.gross = revenue.gross.plus(invoice.grossAmount);
      revenue.net = revenue.net.plus(invoice.netAmount);
      if (invoice.status === PaymentStatus.PENDING) {
        revenue.outstanding = revenue.outstanding.plus(invoice.netAmount);
      }
    }
    for (const invoice of received) {
      const entry = entryFor(invoice.project);
      entry.received = entry.received.plus(invoice.netAmount);
    }
    for (const billing of billingsIssued) {
      const entry = entryFor(billing.project);
      entry.revenue.invoiceCount += 1;
      entry.revenue.gross = entry.revenue.gross.plus(billing.amount);
      entry.revenue.net = entry.revenue.net.plus(billing.amount);
      if (!billing.paymentDate) {
        entry.revenue.outstanding = entry.revenue.outstanding.plus(
          billing.netAmount,
        );
      }
      entry.retainage.withheld = entry.retainage.withheld.plus(
        billing.retainageAmount,
      );
    }
    for (const billing of billingsPaid) {
      const entry = entryFor(billing.project);
      entry.received = entry.received.plus(billing.netAmount);
    }
    for (const release of releasesInPeriod) {
      const entry = entryFor(release.project);
      entry.received = entry.received.plus(release.amount);
      entry.retainage.released = entry.retainage.released.plus(release.amount);
    }
    for (const billing of billingsUntilEnd) {
      const { retainage } = entryFor(billing.project);
      retainage.balance = retainage.balance.plus(billing.retainageAmount);
    }
    for (const release of releasesUntilEnd) {
      const { retainage } = entryFor(release.project);
      retainage.balance = retainage.balance.minus(release.amount);
    }
    for (const entry of projects.values()) {
      const hasActivity =
        entry.revenue.invoiceCount > 0 ||
        !entry.received.isZero() ||
        entry.cost.billCount > 0;
      if (!hasActivity && entry.retainage.balance.isZero()) {
        projects.delete(entry.projectId as string);
      }
    }

    for (const bill of bills) {
      const cost = bill.project ? entryFor(bill.project).cost : administrative;
      cost.billCount += 1;
      cost.total = cost.total.plus(bill.grossAmount);
      const category = cost.byCategory.get(bill.category.id) ?? {
        name: bill.category.name,
        billCount: 0,
        total: zero(),
      };
      category.billCount += 1;
      category.total = category.total.plus(bill.grossAmount);
      cost.byCategory.set(bill.category.id, category);
    }

    const serializeEntry = (entry: Entry) => ({
      projectId: entry.projectId,
      name: entry.name,
      clientName: entry.clientName,
      status: entry.status,
      revenue: serializeRevenue(entry.revenue),
      received: entry.received.toFixed(2),
      outstanding: entry.revenue.outstanding.toFixed(2),
      cost: serializeCost(entry.cost),
      result: entry.received.minus(entry.cost.total).toFixed(2),
      retainage: serializeRetainage(entry.retainage),
    });

    const all = [...projects.values(), unassigned];
    const revenueTotal = all.reduce((acc, entry) => {
      acc.invoiceCount += entry.revenue.invoiceCount;
      acc.gross = acc.gross.plus(entry.revenue.gross);
      acc.net = acc.net.plus(entry.revenue.net);
      acc.outstanding = acc.outstanding.plus(entry.revenue.outstanding);
      return acc;
    }, emptyRevenue());
    const receivedTotal = all.reduce(
      (acc, entry) => acc.plus(entry.received),
      zero(),
    );
    const projectCost = [...projects.values()].reduce(
      (acc, entry) => acc.plus(entry.cost.total),
      zero(),
    );
    const costTotal = projectCost.plus(administrative.total);
    const hasUnassigned =
      unassigned.revenue.invoiceCount > 0 || !unassigned.received.isZero();

    return {
      regime,
      from: query.from,
      to: query.to,
      consolidated: !query.companyId,
      projects: [...projects.values()]
        .sort(
          (a, b) =>
            b.received
              .minus(b.cost.total)
              .comparedTo(a.received.minus(a.cost.total)) ||
            a.name.localeCompare(b.name, 'pt-BR'),
        )
        .map(serializeEntry),
      administrative: serializeCost(administrative),
      unassignedRevenue: hasUnassigned
        ? {
            revenue: serializeRevenue(unassigned.revenue),
            received: unassigned.received.toFixed(2),
            outstanding: unassigned.revenue.outstanding.toFixed(2),
          }
        : null,
      retainageTotals: serializeRetainage(
        [...projects.values()].reduce((acc, entry) => {
          acc.withheld = acc.withheld.plus(entry.retainage.withheld);
          acc.released = acc.released.plus(entry.retainage.released);
          acc.balance = acc.balance.plus(entry.retainage.balance);
          return acc;
        }, emptyRetainage()),
      ),
      totals: {
        revenue: serializeRevenue(revenueTotal),
        received: receivedTotal.toFixed(2),
        outstanding: revenueTotal.outstanding.toFixed(2),
        projectCost: projectCost.toFixed(2),
        administrativeCost: administrative.total.toFixed(2),
        cost: costTotal.toFixed(2),
        result: receivedTotal.minus(costTotal).toFixed(2),
      },
    };
  }

  private newEntry(info: ProjectInfo): Entry {
    return {
      projectId: info?.id ?? null,
      name: info?.name ?? 'Receitas sem obra',
      clientName: info?.clientName ?? null,
      status: info?.status ?? null,
      revenue: emptyRevenue(),
      received: zero(),
      cost: emptyCost(),
      retainage: emptyRetainage(),
    };
  }
}
