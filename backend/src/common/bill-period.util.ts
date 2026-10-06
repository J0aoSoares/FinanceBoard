import { Prisma } from '@prisma/client';
import {
  BillDateBasis,
  CashflowRegime,
} from '../bill/dto/list-bills-query.dto';

type BillPeriodSource = {
  issueDate: Date | null;
  dueDate: Date;
  paymentDate: Date | null;
  invoice: { dueDate: Date; paymentDate: Date | null } | null;
};

export function billPeriodWhere(
  start: Date,
  end: Date,
  regime?: CashflowRegime,
): Prisma.BillWhereInput {
  const range = { gte: start, lt: end };

  if (regime === CashflowRegime.CASH) {
    return {
      OR: [
        { invoiceId: null, paymentDate: range },
        { invoice: { paymentDate: range } },
      ],
    };
  }

  // Competência: emissão da NF; sem NF ainda, vale o vencimento do boleto.
  return {
    OR: [
      { invoiceId: null, issueDate: range },
      { invoiceId: null, issueDate: null, dueDate: range },
      { invoice: { dueDate: range } },
    ],
  };
}

export function billDateBasisWhere(
  start: Date,
  end: Date,
  basis: BillDateBasis,
): Prisma.BillWhereInput {
  const range = { gte: start, lt: end };

  if (basis === BillDateBasis.ISSUE) {
    return {
      OR: [{ issueDate: range }, { issueDate: null, dueDate: range }],
    };
  }
  if (basis === BillDateBasis.PAYMENT) {
    return billPeriodWhere(start, end, CashflowRegime.CASH);
  }
  return {
    OR: [{ invoiceId: null, dueDate: range }, { invoice: { dueDate: range } }],
  };
}

export function billEffectiveDate(
  bill: BillPeriodSource,
  regime?: CashflowRegime,
) {
  if (regime === CashflowRegime.CASH) {
    return bill.invoice ? bill.invoice.paymentDate : bill.paymentDate;
  }
  return bill.invoice ? bill.invoice.dueDate : (bill.issueDate ?? bill.dueDate);
}
