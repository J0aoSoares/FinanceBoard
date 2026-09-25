import { nameKey } from '../../src/common/name-key.util';
import { PrismaService } from '../../src/prisma/prisma.service';

export interface BaseFixtures {
  companyA: string;
  companyB: string;
  projectA: string;
  projectB: string;
  category: string;
  categoryAlt: string;
  supplier: string;
}

export async function createBaseFixtures(
  prisma: PrismaService,
): Promise<BaseFixtures> {
  const companyA = await prisma.company.create({
    data: { legalName: 'Terraplenagem Teste LTDA', cnpj: '11111111000191' },
  });
  const companyB = await prisma.company.create({
    data: { legalName: 'Transporte Teste LTDA', cnpj: '22222222000172' },
  });
  const projectA = await prisma.project.create({
    data: { name: 'Obra Alfa', clientName: 'Cliente Alfa' },
  });
  const projectB = await prisma.project.create({
    data: { name: 'Obra Beta', clientName: 'Cliente Beta' },
  });
  const category = await prisma.category.create({
    data: { name: 'Combustível' },
  });
  const categoryAlt = await prisma.category.create({
    data: { name: 'Locação de Equipamentos' },
  });
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Fornecedor Teste',
      nameKey: nameKey('Fornecedor Teste'),
      document: '33333333000153',
    },
  });

  return {
    companyA: companyA.id,
    companyB: companyB.id,
    projectA: projectA.id,
    projectB: projectB.id,
    category: category.id,
    categoryAlt: categoryAlt.id,
    supplier: supplier.id,
  };
}

export function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function billPayload(
  fixtures: BaseFixtures,
  overrides: Record<string, unknown> = {},
) {
  return {
    documentNumber: 'NF-001',
    grossAmount: '1000.00',
    issueDate: '2026-06-10',
    dueDate: '2026-07-10',
    companyId: fixtures.companyA,
    projectId: fixtures.projectA,
    categoryId: fixtures.category,
    supplierId: fixtures.supplier,
    ...overrides,
  };
}

export function receivablePayload(
  fixtures: BaseFixtures,
  overrides: Record<string, unknown> = {},
) {
  return {
    description: 'Medição 01',
    clientName: 'Cliente Alfa',
    amount: '5000.00',
    issueDate: '2026-06-05',
    dueDate: '2026-07-05',
    companyId: fixtures.companyA,
    projectId: fixtures.projectA,
    ...overrides,
  };
}
