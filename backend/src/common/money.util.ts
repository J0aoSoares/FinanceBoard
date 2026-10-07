import { Prisma } from '@prisma/client';

export function percentOf(amount: Prisma.Decimal, percent: Prisma.Decimal) {
  return amount
    .times(percent)
    .dividedBy(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function sumDecimals(values: Prisma.Decimal[]) {
  return values.reduce((acc, value) => acc.plus(value), new Prisma.Decimal(0));
}
