import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CashflowRegime } from '../bill/dto/list-bills-query.dto';
import { billEffectiveDate, billPeriodWhere } from '../common/bill-period.util';
import {
  monthKey,
  monthRange,
  resolveReportMonths,
} from '../common/period.util';
import {
  receivableEffectiveDate,
  receivablePeriodWhere,
} from '../common/receivable-period.util';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

type MonthBucket = {
  inflow: Prisma.Decimal;
  inflowGross: Prisma.Decimal;
  inflowWithholdings: Prisma.Decimal;
  outflow: Prisma.Decimal;
};

@Injectable()
export class CashflowService {
  constructor(private readonly prisma: PrismaService) {}

  async build(query: ReportPeriodQueryDto) {
    const months = resolveReportMonths(query.from, query.to);
    const start = monthRange(query.from).start;
    const end = monthRange(query.to).end;
    const regime = query.regime ?? CashflowRegime.ACCRUAL;

    const buckets = new Map<string, MonthBucket>(
      months.map((month) => [month, this.emptyBucket()]),
    );

    const bills = await this.prisma.bill.findMany({
      where: {
        AND: [
          billPeriodWhere(start, end, regime),
          query.companyId ? { companyId: query.companyId } : {},
          query.projectId ? { projectId: query.projectId } : {},
        ],
      },
      select: {
        netAmount: true,
        issueDate: true,
        dueDate: true,
        paymentDate: true,
        invoice: { select: { dueDate: true, paymentDate: true } },
      },
    });

    for (const bill of bills) {
      const date = billEffectiveDate(bill, regime);
      const bucket = date && buckets.get(monthKey(date));
      if (bucket) {
        bucket.outflow = bucket.outflow.plus(bill.netAmount);
      }
    }

    const receivables = await this.prisma.receivable.findMany({
      where: {
        AND: [
          receivablePeriodWhere(start, end, regime),
          query.companyId ? { companyId: query.companyId } : {},
          query.projectId ? { projectId: query.projectId } : {},
        ],
      },
      select: {
        grossAmount: true,
        netAmount: true,
        competence: true,
        receiptDate: true,
      },
    });

    for (const receivable of receivables) {
      const date = receivableEffectiveDate(receivable, regime);
      const bucket = date && buckets.get(monthKey(date));
      if (!bucket) {
        continue;
      }
      bucket.inflow = bucket.inflow.plus(receivable.netAmount);
      bucket.inflowGross = bucket.inflowGross.plus(receivable.grossAmount);
      bucket.inflowWithholdings = bucket.inflowWithholdings.plus(
        receivable.grossAmount.minus(receivable.netAmount),
      );
    }

    let accumulated = new Prisma.Decimal(0);
    const monthlyResults = months.map((month) => {
      const bucket = buckets.get(month) as MonthBucket;
      const balance = bucket.inflow.minus(bucket.outflow);
      accumulated = accumulated.plus(balance);
      return {
        month,
        inflow: bucket.inflow.toFixed(2),
        inflowGross: bucket.inflowGross.toFixed(2),
        inflowWithholdings: bucket.inflowWithholdings.toFixed(2),
        outflow: bucket.outflow.toFixed(2),
        balance: balance.toFixed(2),
        accumulatedBalance: accumulated.toFixed(2),
      };
    });

    const totals = months.reduce((acc, month) => {
      const bucket = buckets.get(month) as MonthBucket;
      return {
        inflow: acc.inflow.plus(bucket.inflow),
        inflowGross: acc.inflowGross.plus(bucket.inflowGross),
        inflowWithholdings: acc.inflowWithholdings.plus(
          bucket.inflowWithholdings,
        ),
        outflow: acc.outflow.plus(bucket.outflow),
      };
    }, this.emptyBucket());

    return {
      regime,
      from: query.from,
      to: query.to,
      consolidated: !query.companyId,
      months: monthlyResults,
      totals: {
        inflow: totals.inflow.toFixed(2),
        inflowGross: totals.inflowGross.toFixed(2),
        inflowWithholdings: totals.inflowWithholdings.toFixed(2),
        outflow: totals.outflow.toFixed(2),
        balance: totals.inflow.minus(totals.outflow).toFixed(2),
      },
    };
  }

  private emptyBucket(): MonthBucket {
    return {
      inflow: new Prisma.Decimal(0),
      inflowGross: new Prisma.Decimal(0),
      inflowWithholdings: new Prisma.Decimal(0),
      outflow: new Prisma.Decimal(0),
    };
  }
}
