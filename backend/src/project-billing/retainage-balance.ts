import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type RetainageScope = { projectId: string; companyId: string };

export const SERIALIZABLE = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};

export async function retainageBalance(
  tx: Prisma.TransactionClient,
  scope: RetainageScope,
) {
  const [billings, releases] = await Promise.all([
    tx.projectBilling.aggregate({
      where: scope,
      _sum: { retainageAmount: true },
    }),
    tx.retainageRelease.aggregate({ where: scope, _sum: { amount: true } }),
  ]);
  const withheld = billings._sum.retainageAmount ?? new Prisma.Decimal(0);
  const released = releases._sum.amount ?? new Prisma.Decimal(0);
  return { withheld, released, balance: withheld.minus(released) };
}

export async function assertRetainageCovered(
  tx: Prisma.TransactionClient,
  scopes: RetainageScope[],
) {
  for (const scope of scopes) {
    const { withheld, released } = await retainageBalance(tx, scope);
    if (released.gt(withheld)) {
      throw new ConflictException(
        `Operação recusada: a caução já devolvida nesta obra (${released.toFixed(2)}) ficaria maior que a caução retida (${withheld.toFixed(2)})`,
      );
    }
  }
}

export function isSerializationFailure(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

export const CONCURRENT_UPDATE =
  'Outra operação alterou a caução desta obra ao mesmo tempo; tente novamente';
