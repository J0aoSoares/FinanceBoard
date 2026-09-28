import { Prisma } from '@prisma/client';
import { CashflowRegime } from '../bill/dto/list-bills-query.dto';

type ReceivablePeriodSource = {
  competence: Date;
  receiptDate: Date | null;
};

export function receivablePeriodWhere(
  start: Date,
  end: Date,
  regime?: CashflowRegime,
): Prisma.ReceivableWhereInput {
  const range = { gte: start, lt: end };
  return regime === CashflowRegime.CASH
    ? { receiptDate: range }
    : { competence: range };
}

export function receivedWithinWhere(
  start: Date,
  end: Date,
): Prisma.ReceivableWhereInput {
  return { receiptDate: { gte: start, lt: end } };
}

export function receivableEffectiveDate(
  receivable: ReceivablePeriodSource,
  regime?: CashflowRegime,
) {
  return regime === CashflowRegime.CASH
    ? receivable.receiptDate
    : receivable.competence;
}
