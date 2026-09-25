import {
  PaymentStatus,
  PrismaClient,
  ProjectStatus,
  TaxType,
  UserRole,
} from '@prisma/client';
import { Algorithm, hash } from '@node-rs/argon2';
import { nameKey } from '../src/common/name-key.util';

const prisma = new PrismaClient();

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).+$/u;

async function seedAdminUser() {
  const name = process.env.SEED_ADMIN_NAME;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  const missing = [
    !name && 'SEED_ADMIN_NAME',
    !email && 'SEED_ADMIN_EMAIL',
    !password && 'SEED_ADMIN_PASSWORD',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Defina ${missing.join(', ')} no .env antes de rodar o seed. Não existe senha padrão embutida no código.`,
    );
  }

  if (
    (password as string).length < PASSWORD_MIN_LENGTH ||
    !PASSWORD_PATTERN.test(password as string)
  ) {
    throw new Error(
      'SEED_ADMIN_PASSWORD deve ter ao menos 10 caracteres, incluindo pelo menos uma letra e um número.',
    );
  }

  const passwordHash = await hash(password as string, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const normalizedEmail = (email as string).trim().toLowerCase();

  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { name: name as string, role: UserRole.ADMIN, isActive: true },
    create: {
      name: name as string,
      email: normalizedEmail,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  return normalizedEmail;
}

type SeedBill = {
  documentNumber: string;
  grossAmount: string;
  netAmount: string;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  companyId: string;
  projectId: string | null;
  categoryId: string;
  supplierId: string;
  withholdings?: { type: TaxType; amount: string }[];
};

type SeedReceivable = {
  description: string;
  clientName: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  receiptDate?: string;
  companyId: string;
  projectId: string | null;
};

const COMPANIES = [
  {
    legalName: 'Empresa de Terraplenagem e Locações LTDA',
    cnpj: '11111111000191',
  },
  {
    legalName: 'Empresa de Transporte e Serviços LTDA',
    cnpj: '22222222000172',
  },
];

const CATEGORIES = [
  'Combustível',
  'Manutenção de Equipamentos',
  'Peças e Insumos',
  'Locação de Equipamentos',
  'Fretes',
  'Mão de Obra Terceirizada',
  'Pneus',
  'Impostos e Taxas',
  'Seguros',
  'Despesas Administrativas',
];

const SUPPLIERS = [
  { name: 'Posto Rodoviário Central', document: '33333333000153' },
  { name: 'Auto Peças Diesel', document: '44444444000134' },
  { name: 'Locadora de Máquinas Sul', document: '55555555000115' },
  { name: 'Oficina Mecânica Pesada', document: '66666666000196' },
  { name: 'Transportadora Parceira', document: '77777777000177' },
  { name: 'Escritório Contábil Associados', document: '88888888000158' },
];

const PROJECTS = [
  {
    name: 'Terraplenagem Loteamento Vale Verde',
    clientName: 'Construtora Vale Verde',
    status: ProjectStatus.ACTIVE,
  },
  {
    name: 'Pavimentação Rodovia Municipal',
    clientName: 'Prefeitura Municipal',
    status: ProjectStatus.ACTIVE,
  },
  {
    name: 'Movimentação de Solo Galpão Industrial',
    clientName: 'Indústria Metalúrgica Norte',
    status: ProjectStatus.CLOSED,
  },
  {
    name: 'Transporte de Agregados',
    clientName: 'Mineradora Pedra Branca',
    status: ProjectStatus.ACTIVE,
  },
];

async function main() {
  // O usuário ADMIN é garantido antes de qualquer coisa: numa base que já tem
  // lançamentos, o seed de exemplo não roda, e sem isto não haveria como criar
  // o primeiro acesso sem SQL manual. O upsert torna a chamada idempotente.
  const adminEmail = await seedAdminUser();
  console.log(`Usuário ADMIN disponível: ${adminEmail}`);

  const existingBills = await prisma.bill.count();
  if (existingBills > 0) {
    console.log('O banco já contém lançamentos. Nada mais foi alterado.');
    console.log('Para recriar a base de exemplo, rode: npm run prisma:reset');
    return;
  }

  // Num banco vazio de PRODUÇÃO a base de exemplo (CNPJs, obras e contas
  // fictícias) não pode entrar. Só em desenvolvimento, com opt-in explícito.
  if (process.env.SEED_SAMPLE_DATA !== 'true') {
    console.log(
      'Banco vazio e SEED_SAMPLE_DATA != "true": base de exemplo NÃO criada. Só o ADMIN foi garantido.',
    );
    return;
  }

  const companies = [];
  for (const company of COMPANIES) {
    companies.push(
      await prisma.company.upsert({
        where: { cnpj: company.cnpj },
        update: { legalName: company.legalName },
        create: company,
      }),
    );
  }
  const [terraplenagem, transporte] = companies;

  const categories = new Map<string, string>();
  for (const name of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories.set(name, category.id);
  }
  const category = (name: string) => categories.get(name) as string;

  const suppliers = new Map<string, string>();
  for (const supplier of SUPPLIERS) {
    const key = nameKey(supplier.name);
    const existing = await prisma.supplier.findUnique({
      where: { nameKey: key },
    });
    const record =
      existing ??
      (await prisma.supplier.create({ data: { ...supplier, nameKey: key } }));
    suppliers.set(supplier.name, record.id);
  }
  const supplier = (name: string) => suppliers.get(name) as string;

  const projects = new Map<string, string>();
  for (const project of PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { name: project.name },
    });
    const record = existing ?? (await prisma.project.create({ data: project }));
    projects.set(project.name, record.id);
  }
  const project = (name: string) => projects.get(name) as string;

  const valeVerde = project('Terraplenagem Loteamento Vale Verde');
  const rodovia = project('Pavimentação Rodovia Municipal');
  const galpao = project('Movimentação de Solo Galpão Industrial');
  const agregados = project('Transporte de Agregados');

  const paidBills: SeedBill[] = [
    {
      documentNumber: 'NF-1042',
      grossAmount: '8450.00',
      netAmount: '8450.00',
      issueDate: '2026-05-08',
      dueDate: '2026-06-07',
      paymentDate: '2026-06-05',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Combustível'),
      supplierId: supplier('Posto Rodoviário Central'),
    },
    {
      documentNumber: 'NF-1088',
      grossAmount: '12000.00',
      netAmount: '10680.00',
      issueDate: '2026-05-20',
      dueDate: '2026-06-20',
      paymentDate: '2026-06-18',
      companyId: terraplenagem.id,
      projectId: rodovia,
      categoryId: category('Mão de Obra Terceirizada'),
      supplierId: supplier('Oficina Mecânica Pesada'),
      withholdings: [{ type: TaxType.INSS, amount: '1320.00' }],
    },
    {
      documentNumber: 'NF-2201',
      grossAmount: '6300.00',
      netAmount: '6300.00',
      issueDate: '2026-06-03',
      dueDate: '2026-07-03',
      paymentDate: '2026-07-02',
      companyId: transporte.id,
      projectId: agregados,
      categoryId: category('Fretes'),
      supplierId: supplier('Transportadora Parceira'),
    },
    {
      documentNumber: 'NF-2245',
      grossAmount: '4200.00',
      netAmount: '4074.00',
      issueDate: '2026-06-25',
      dueDate: '2026-07-25',
      paymentDate: '2026-07-24',
      companyId: transporte.id,
      projectId: null,
      categoryId: category('Despesas Administrativas'),
      supplierId: supplier('Escritório Contábil Associados'),
      withholdings: [{ type: TaxType.ISS, amount: '126.00' }],
    },
  ];

  const overdueBills: SeedBill[] = [
    {
      documentNumber: 'NF-1130',
      grossAmount: '3750.00',
      netAmount: '3750.00',
      issueDate: '2026-06-15',
      dueDate: '2026-07-15',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Peças e Insumos'),
      supplierId: supplier('Auto Peças Diesel'),
    },
    {
      documentNumber: 'NF-2310',
      grossAmount: '9800.00',
      netAmount: '9800.00',
      issueDate: '2026-07-02',
      dueDate: '2026-07-30',
      companyId: transporte.id,
      projectId: agregados,
      categoryId: category('Pneus'),
      supplierId: supplier('Auto Peças Diesel'),
    },
  ];

  const pendingBills: SeedBill[] = [
    {
      documentNumber: 'NF-1205',
      grossAmount: '15400.00',
      netAmount: '15400.00',
      issueDate: '2026-07-18',
      dueDate: '2026-08-18',
      companyId: terraplenagem.id,
      projectId: rodovia,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
    {
      documentNumber: 'NF-1233',
      grossAmount: '5600.00',
      netAmount: '5600.00',
      issueDate: '2026-07-28',
      dueDate: '2026-08-27',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Combustível'),
      supplierId: supplier('Posto Rodoviário Central'),
    },
    {
      documentNumber: 'NF-2388',
      grossAmount: '7200.00',
      netAmount: '6552.00',
      issueDate: '2026-08-01',
      dueDate: '2026-09-01',
      companyId: transporte.id,
      projectId: agregados,
      categoryId: category('Manutenção de Equipamentos'),
      supplierId: supplier('Oficina Mecânica Pesada'),
      withholdings: [
        { type: TaxType.INSS, amount: '432.00' },
        { type: TaxType.ISS, amount: '216.00' },
      ],
    },
    {
      documentNumber: 'NF-1250',
      grossAmount: '2900.00',
      netAmount: '2900.00',
      issueDate: '2026-08-03',
      dueDate: '2026-09-10',
      companyId: terraplenagem.id,
      projectId: null,
      categoryId: category('Seguros'),
      supplierId: supplier('Escritório Contábil Associados'),
    },
  ];

  const invoicedBills: SeedBill[] = [
    {
      documentNumber: 'NF-1301',
      grossAmount: '4800.00',
      netAmount: '4800.00',
      issueDate: '2026-06-10',
      dueDate: '2026-07-10',
      companyId: terraplenagem.id,
      projectId: galpao,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
    {
      documentNumber: 'NF-1302',
      grossAmount: '5200.00',
      netAmount: '5200.00',
      issueDate: '2026-07-12',
      dueDate: '2026-08-12',
      companyId: terraplenagem.id,
      projectId: galpao,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
    {
      documentNumber: 'NF-1303',
      grossAmount: '3100.00',
      netAmount: '3100.00',
      issueDate: '2026-08-02',
      dueDate: '2026-09-02',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
  ];

  async function createBill(data: SeedBill, invoiceId?: string) {
    const { withholdings, paymentDate, ...rest } = data;

    return prisma.bill.create({
      data: {
        ...rest,
        issueDate: new Date(rest.issueDate),
        dueDate: new Date(rest.dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        status: paymentDate ? PaymentStatus.PAID : PaymentStatus.PENDING,
        hasTaxWithholding: Boolean(withholdings?.length),
        invoiceId: invoiceId ?? null,
        taxWithholdings: withholdings ? { create: withholdings } : undefined,
      },
    });
  }

  for (const bill of [...paidBills, ...overdueBills, ...pendingBills]) {
    await createBill(bill);
  }

  const invoice = await prisma.invoice.create({
    data: {
      number: 'FAT-2026-08',
      companyId: terraplenagem.id,
      supplierId: supplier('Locadora de Máquinas Sul'),
      dueDate: new Date('2026-09-15'),
    },
  });
  for (const bill of invoicedBills) {
    await createBill(bill, invoice.id);
  }

  const receivables: SeedReceivable[] = [
    {
      description: 'Medição 03 - Loteamento Vale Verde',
      clientName: 'Construtora Vale Verde',
      amount: '48000.00',
      issueDate: '2026-05-30',
      dueDate: '2026-06-30',
      receiptDate: '2026-06-28',
      companyId: terraplenagem.id,
      projectId: valeVerde,
    },
    {
      description: 'Medição 01 - Rodovia Municipal',
      clientName: 'Prefeitura Municipal',
      amount: '65000.00',
      issueDate: '2026-06-28',
      dueDate: '2026-07-28',
      receiptDate: '2026-07-30',
      companyId: terraplenagem.id,
      projectId: rodovia,
    },
    {
      description: 'Transporte de agregados - julho',
      clientName: 'Mineradora Pedra Branca',
      amount: '32500.00',
      issueDate: '2026-07-31',
      dueDate: '2026-08-30',
      companyId: transporte.id,
      projectId: agregados,
    },
    {
      description: 'Medição 04 - Loteamento Vale Verde',
      clientName: 'Construtora Vale Verde',
      amount: '51200.00',
      issueDate: '2026-08-01',
      dueDate: '2026-09-05',
      companyId: terraplenagem.id,
      projectId: valeVerde,
    },
    {
      description: 'Locação de caminhão - junho',
      clientName: 'Indústria Metalúrgica Norte',
      amount: '18000.00',
      issueDate: '2026-06-20',
      dueDate: '2026-07-20',
      companyId: transporte.id,
      projectId: null,
    },
  ];

  for (const receivable of receivables) {
    const { receiptDate, ...rest } = receivable;
    await prisma.receivable.create({
      data: {
        ...rest,
        issueDate: new Date(rest.issueDate),
        dueDate: new Date(rest.dueDate),
        receiptDate: receiptDate ? new Date(receiptDate) : null,
        status: receiptDate ? PaymentStatus.PAID : PaymentStatus.PENDING,
      },
    });
  }

  const counts = {
    usuários: await prisma.user.count(),
    empresas: await prisma.company.count(),
    obras: await prisma.project.count(),
    categorias: await prisma.category.count(),
    fornecedores: await prisma.supplier.count(),
    contas: await prisma.bill.count(),
    faturas: await prisma.invoice.count(),
    recebíveis: await prisma.receivable.count(),
  };

  console.log('Base de exemplo criada:');
  console.table(counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
