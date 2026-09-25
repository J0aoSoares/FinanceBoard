import { Injectable } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CashflowRegime } from '../bill/dto/list-bills-query.dto';
import { billPeriodWhere } from '../common/bill-period.util';
import { monthRange, resolveReportMonths } from '../common/period.util';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

const WITHOUT_PROJECT = 'without-project';

type CostEntry = {
  projectId: string | null;
  name: string;
  clientName: string | null;
  status: ProjectStatus | null;
  grossTotal: Prisma.Decimal;
  netTotal: Prisma.Decimal;
  billCount: number;
  byCategory: Map<
    string,
    { name: string; grossTotal: Prisma.Decimal; billCount: number }
  >;
};

@Injectable()
export class ProjectCostService {
  constructor(private readonly prisma: PrismaService) {}

  async build(query: ReportPeriodQueryDto) {
    resolveReportMonths(query.from, query.to);
    const start = monthRange(query.from).start;
    const end = monthRange(query.to).end;
    const regime = query.regime ?? CashflowRegime.ACCRUAL;

    const bills = await this.prisma.bill.findMany({
      where: {
        AND: [
          billPeriodWhere(start, end, regime),
          query.companyId ? { companyId: query.companyId } : {},
          query.projectId ? { projectId: query.projectId } : {},
        ],
      },
      select: {
        grossAmount: true,
        netAmount: true,
        project: {
          select: { id: true, name: true, clientName: true, status: true },
        },
        category: { select: { id: true, name: true } },
      },
    });

    const entries = new Map<string, CostEntry>();
    let grandGross = new Prisma.Decimal(0);
    let grandNet = new Prisma.Decimal(0);

    for (const bill of bills) {
      const key = bill.project ? bill.project.id : WITHOUT_PROJECT;
      const entry =
        entries.get(key) ??
        ({
          projectId: bill.project ? bill.project.id : null,
          name: bill.project
            ? bill.project.name
            : 'Despesas administrativas (sem obra)',
          clientName: bill.project ? bill.project.clientName : null,
          status: bill.project ? bill.project.status : null,
          grossTotal: new Prisma.Decimal(0),
          netTotal: new Prisma.Decimal(0),
          billCount: 0,
          byCategory: new Map(),
        } satisfies CostEntry);

      entry.grossTotal = entry.grossTotal.plus(bill.grossAmount);
      entry.netTotal = entry.netTotal.plus(bill.netAmount);
      entry.billCount += 1;

      const category = entry.byCategory.get(bill.category.id) ?? {
        name: bill.category.name,
        grossTotal: new Prisma.Decimal(0),
        billCount: 0,
      };
      category.grossTotal = category.grossTotal.plus(bill.grossAmount);
      category.billCount += 1;
      entry.byCategory.set(bill.category.id, category);

      entries.set(key, entry);
      grandGross = grandGross.plus(bill.grossAmount);
      grandNet = grandNet.plus(bill.netAmount);
    }

    const projects = [...entries.values()]
      .sort((a, b) => b.grossTotal.comparedTo(a.grossTotal))
      .map((entry) => ({
        projectId: entry.projectId,
        name: entry.name,
        clientName: entry.clientName,
        status: entry.status,
        billCount: entry.billCount,
        grossTotal: entry.grossTotal.toFixed(2),
        netTotal: entry.netTotal.toFixed(2),
        shareOfTotal: grandGross.isZero()
          ? '0.00'
          : entry.grossTotal.dividedBy(grandGross).times(100).toFixed(2),
        byCategory: [...entry.byCategory.entries()]
          .sort((a, b) => b[1].grossTotal.comparedTo(a[1].grossTotal))
          .map(([categoryId, category]) => ({
            categoryId,
            name: category.name,
            billCount: category.billCount,
            grossTotal: category.grossTotal.toFixed(2),
          })),
      }));

    return {
      regime,
      from: query.from,
      to: query.to,
      consolidated: !query.companyId,
      projects,
      totals: {
        billCount: bills.length,
        grossTotal: grandGross.toFixed(2),
        netTotal: grandNet.toFixed(2),
      },
    };
  }
}
