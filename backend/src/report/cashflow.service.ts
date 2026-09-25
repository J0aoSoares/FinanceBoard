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
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

type MonthBucket = {
  inflow: Prisma.Decimal;
  outflow: Prisma.Decimal;
  outflowGross: Prisma.Decimal;
  withholdings: Prisma.Decimal;
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
        grossAmount: true,
        netAmount: true,
        issueDate: true,
        paymentDate: true,
        invoice: { select: { dueDate: true, paymentDate: true } },
      },
    });

    for (const bill of bills) {
      const date = billEffectiveDate(bill, regime);
      const bucket = date && buckets.get(monthKey(date));
      if (!bucket) {
        continue;
      }
      bucket.outflow = bucket.outflow.plus(bill.netAmount);
      bucket.outflowGross = bucket.outflowGross.plus(bill.grossAmount);
      bucket.withholdings = bucket.withholdings.plus(
        bill.grossAmount.minus(bill.netAmount),
      );
    }

    const receivableDateField =
      regime === CashflowRegime.CASH ? 'receiptDate' : 'issueDate';
    const receivables = await this.prisma.receivable.findMany({
      where: {
        [receivableDateField]: { gte: start, lt: end },
        companyId: query.companyId,
        projectId: query.projectId,
      },
      select: { amount: true, issueDate: true, receiptDate: true },
    });

    for (const receivable of receivables) {
      const date =
        regime === CashflowRegime.CASH
          ? receivable.receiptDate
          : receivable.issueDate;
      const bucket = date && buckets.get(monthKey(date));
      if (!bucket) {
        continue;
      }
      bucket.inflow = bucket.inflow.plus(receivable.amount);
    }

    let accumulated = new Prisma.Decimal(0);
    const monthlyResults = months.map((month) => {
      const bucket = buckets.get(month) as MonthBucket;
      const balance = bucket.inflow.minus(bucket.outflow);
      accumulated = accumulated.plus(balance);
      return {
        month,
        inflow: bucket.inflow.toFixed(2),
        outflow: bucket.outflow.toFixed(2),
        outflowGross: bucket.outflowGross.toFixed(2),
        withholdings: bucket.withholdings.toFixed(2),
        balance: balance.toFixed(2),
        accumulatedBalance: accumulated.toFixed(2),
      };
    });

    const totals = months.reduce((acc, month) => {
      const bucket = buckets.get(month) as MonthBucket;
      return {
        inflow: acc.inflow.plus(bucket.inflow),
        outflow: acc.outflow.plus(bucket.outflow),
        outflowGross: acc.outflowGross.plus(bucket.outflowGross),
        withholdings: acc.withholdings.plus(bucket.withholdings),
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
        outflow: totals.outflow.toFixed(2),
        outflowGross: totals.outflowGross.toFixed(2),
        withholdings: totals.withholdings.toFixed(2),
        balance: totals.inflow.minus(totals.outflow).toFixed(2),
      },
    };
  }

  private emptyBucket(): MonthBucket {
    return {
      inflow: new Prisma.Decimal(0),
      outflow: new Prisma.Decimal(0),
      outflowGross: new Prisma.Decimal(0),
      withholdings: new Prisma.Decimal(0),
    };
  }
}
