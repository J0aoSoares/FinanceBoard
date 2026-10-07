import { Prisma } from '@prisma/client';
import { CashflowRegime } from '../bill/dto/list-bills-query.dto';

export enum ProjectBillingDateBasis {
  DUE = 'due',
  PAYMENT = 'payment',
}

type ProjectBillingPeriodSource = {
  dueDate: Date;
  paymentDate: Date | null;
};

export function projectBillingPeriodWhere(
  start: Date,
  end: Date,
  regime?: CashflowRegime,
): Prisma.ProjectBillingWhereInput {
  return projectBillingDateBasisWhere(
    start,
    end,
    regime === CashflowRegime.CASH
      ? ProjectBillingDateBasis.PAYMENT
      : ProjectBillingDateBasis.DUE,
  );
}

export function projectBillingDateBasisWhere(
  start: Date,
  end: Date,
  basis: ProjectBillingDateBasis = ProjectBillingDateBasis.DUE,
): Prisma.ProjectBillingWhereInput {
  const range = { gte: start, lt: end };
  return basis === ProjectBillingDateBasis.PAYMENT
    ? { paymentDate: range }
    : { dueDate: range };
}

export function projectBillingEffectiveDate(
  billing: ProjectBillingPeriodSource,
  regime?: CashflowRegime,
) {
  return regime === CashflowRegime.CASH ? billing.paymentDate : billing.dueDate;
}

export function retainageReleaseWithinWhere(
  start: Date,
  end: Date,
): Prisma.RetainageReleaseWhereInput {
  return { returnDate: { gte: start, lt: end } };
}
