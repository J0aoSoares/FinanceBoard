import {
  PaymentStatus,
  Prisma,
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
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  digitableLine?: string;
  companyId: string;
  projectId: string | null;
  categoryId: string;
  supplierId: string;
};

type SeedReceivable = {
  number: string;
  description: string;
  clientName: string;
  grossAmount: string;
  withholdings: { type: TaxType; amount: string }[];
  competence: string;
  issueDate: string;
  dueDate: string;
  receiptDate?: string;
  companyId: string;
  projectId: string;
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
  const adminEmail = await seedAdminUser();
  console.log(`Usuário ADMIN disponível: ${adminEmail}`);

  const existingBills = await prisma.bill.count();
  if (existingBills > 0) {
    console.log('O banco já contém lançamentos. Nada mais foi alterado.');
    console.log('Para recriar a base de exemplo, rode: npm run prisma:reset');
    return;
  }

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
      description: 'Diesel S10 - frota Vale Verde',
      amount: '8450.00',
      issueDate: '2026-05-08',
      dueDate: '2026-06-07',
      paymentDate: '2026-06-05',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Combustível'),
      supplierId: supplier('Posto Rodoviário Central'),
    },
    {
      description: 'Revisão de motoniveladora',
      amount: '10680.00',
      issueDate: '2026-05-20',
      dueDate: '2026-06-20',
      paymentDate: '2026-06-18',
      companyId: terraplenagem.id,
      projectId: rodovia,
      categoryId: category('Manutenção de Equipamentos'),
      supplierId: supplier('Oficina Mecânica Pesada'),
    },
    {
      description: 'Frete de brita - junho',
      amount: '6300.00',
      issueDate: '2026-06-03',
      dueDate: '2026-07-03',
      paymentDate: '2026-07-02',
      companyId: transporte.id,
      projectId: agregados,
      categoryId: category('Fretes'),
      supplierId: supplier('Transportadora Parceira'),
    },
    {
      description: 'Honorários contábeis - junho',
      amount: '4074.00',
      issueDate: '2026-06-25',
      dueDate: '2026-07-25',
      paymentDate: '2026-07-24',
      companyId: transporte.id,
      projectId: null,
      categoryId: category('Despesas Administrativas'),
      supplierId: supplier('Escritório Contábil Associados'),
    },
  ];

  const overdueBills: SeedBill[] = [
    {
      description: 'Filtros e óleo hidráulico',
      amount: '3750.00',
      issueDate: '2026-06-15',
      dueDate: '2026-07-15',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Peças e Insumos'),
      supplierId: supplier('Auto Peças Diesel'),
    },
    {
      description: 'Pneus para caminhões basculantes',
      amount: '9800.00',
      issueDate: '2026-07-02',
      dueDate: '2026-07-30',
      digitableLine: '10499876524321000001423456789017115230000980000',
      companyId: transporte.id,
      projectId: agregados,
      categoryId: category('Pneus'),
      supplierId: supplier('Auto Peças Diesel'),
    },
  ];

  const pendingBills: SeedBill[] = [
    {
      description: 'Locação de escavadeira - agosto',
      amount: '15400.00',
      issueDate: '2026-07-18',
      dueDate: '2026-08-18',
      digitableLine: '23791234540000000000012345670009115420001540000',
      companyId: terraplenagem.id,
      projectId: rodovia,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
    {
      description: 'Diesel S10 - frota Vale Verde',
      amount: '5600.00',
      issueDate: '2026-07-28',
      dueDate: '2026-08-27',
      digitableLine: '00190000090123456789701234567897715510000560000',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Combustível'),
      supplierId: supplier('Posto Rodoviário Central'),
    },
    {
      description: 'Manutenção de caminhões - agosto',
      amount: '6552.00',
      issueDate: '2026-08-01',
      dueDate: '2026-09-01',
      companyId: transporte.id,
      projectId: agregados,
      categoryId: category('Manutenção de Equipamentos'),
      supplierId: supplier('Oficina Mecânica Pesada'),
    },
    {
      description: 'Seguro da frota - setembro',
      amount: '2900.00',
      issueDate: '2026-08-03',
      dueDate: '2026-09-10',
      digitableLine: '34191570070012345000911223344000815650000290000',
      companyId: terraplenagem.id,
      projectId: null,
      categoryId: category('Seguros'),
      supplierId: supplier('Escritório Contábil Associados'),
    },
  ];

  const invoicedBills: SeedBill[] = [
    {
      description: 'Locação de rolo compactador - junho',
      amount: '4800.00',
      issueDate: '2026-06-10',
      dueDate: '2026-07-10',
      companyId: terraplenagem.id,
      projectId: galpao,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
    {
      description: 'Locação de rolo compactador - julho',
      amount: '5200.00',
      issueDate: '2026-07-12',
      dueDate: '2026-08-12',
      companyId: terraplenagem.id,
      projectId: galpao,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
    {
      description: 'Locação de rolo compactador - agosto',
      amount: '3100.00',
      issueDate: '2026-08-02',
      dueDate: '2026-09-02',
      companyId: terraplenagem.id,
      projectId: valeVerde,
      categoryId: category('Locação de Equipamentos'),
      supplierId: supplier('Locadora de Máquinas Sul'),
    },
  ];

  async function createBill(data: SeedBill, invoiceId?: string) {
    const { amount, paymentDate, digitableLine, ...rest } = data;

    return prisma.bill.create({
      data: {
        ...rest,
        documentNumber: rest.description,
        grossAmount: amount,
        netAmount: amount,
        digitableLine: digitableLine ?? null,
        issueDate: new Date(rest.issueDate),
        dueDate: new Date(rest.dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        status: paymentDate ? PaymentStatus.PAID : PaymentStatus.PENDING,
        hasTaxWithholding: false,
        invoiceId: invoiceId ?? null,
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

  const installmentLines = [
    '03395550050000000000000000000000114470000480000',
    '03395550050000000000000000000117514780000480000',
    '03395550050000000000000000000224215080000480000',
    '03395550050000000000000000000331715390000480000',
    '03395550050000000000000000000448115700000480000',
    '03395550050000000000000000000554916000000480000',
    '03395550050000000000000000000661316310000480000',
    '03395550050000000000000000000778216610000480000',
    '03395550050000000000000000000885716920000480000',
    '03395550050000000000000000000992117230000480000',
  ];
  const installmentDescription = 'Rompedor hidráulico para escavadeira';
  const group = await prisma.billGroup.create({ data: {} });
  for (const [index, digitableLine] of installmentLines.entries()) {
    const monthIndex = 4 + index;
    const year = 2026 + Math.floor(monthIndex / 12);
    const month = String((monthIndex % 12) + 1).padStart(2, '0');
    const label = String.fromCharCode(65 + index);
    const paid = index < 4;
    await prisma.bill.create({
      data: {
        documentNumber: `${installmentDescription} · ${label}`,
        description: installmentDescription,
        digitableLine,
        installmentLabel: label,
        installmentNumber: index + 1,
        grossAmount: '4800.00',
        netAmount: '4800.00',
        issueDate: new Date('2026-04-20'),
        dueDate: new Date(`${year}-${month}-15`),
        paymentDate: paid ? new Date(`${year}-${month}-14`) : null,
        status: paid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        companyId: terraplenagem.id,
        projectId: valeVerde,
        categoryId: category('Peças e Insumos'),
        supplierId: supplier('Auto Peças Diesel'),
        groupId: group.id,
      },
    });
  }

  const serviceInvoices: SeedReceivable[] = [
    {
      number: 'NFS-0101',
      description: 'Medição 03 - Loteamento Vale Verde',
      clientName: 'Construtora Vale Verde',
      grossAmount: '48000.00',
      withholdings: [
        { type: TaxType.INSS, amount: '5280.00' },
        { type: TaxType.ISS, amount: '2400.00' },
      ],
      competence: '2026-05',
      issueDate: '2026-05-30',
      dueDate: '2026-06-30',
      receiptDate: '2026-06-28',
      companyId: terraplenagem.id,
      projectId: valeVerde,
    },
    {
      number: 'NFS-0102',
      description: 'Medição 01 - Rodovia Municipal',
      clientName: 'Prefeitura Municipal',
      grossAmount: '65000.00',
      withholdings: [
        { type: TaxType.ISS, amount: '3250.00' },
        { type: TaxType.IRRF, amount: '975.00' },
      ],
      competence: '2026-06',
      issueDate: '2026-06-28',
      dueDate: '2026-07-28',
      receiptDate: '2026-07-30',
      companyId: terraplenagem.id,
      projectId: rodovia,
    },
    {
      number: 'NFS-0201',
      description: 'Transporte de agregados - julho',
      clientName: 'Mineradora Pedra Branca',
      grossAmount: '32500.00',
      withholdings: [{ type: TaxType.INSS, amount: '3575.00' }],
      competence: '2026-07',
      issueDate: '2026-07-31',
      dueDate: '2026-08-30',
      companyId: transporte.id,
      projectId: agregados,
    },
    {
      number: 'NFS-0103',
      description: 'Medição 04 - Loteamento Vale Verde',
      clientName: 'Construtora Vale Verde',
      grossAmount: '51200.00',
      withholdings: [
        { type: TaxType.INSS, amount: '5632.00' },
        { type: TaxType.ISS, amount: '2560.00' },
      ],
      competence: '2026-07',
      issueDate: '2026-08-01',
      dueDate: '2026-09-05',
      companyId: terraplenagem.id,
      projectId: valeVerde,
    },
    {
      number: 'NFS-0202',
      description: 'Locação de caminhão - junho',
      clientName: 'Indústria Metalúrgica Norte',
      grossAmount: '18000.00',
      withholdings: [],
      competence: '2026-06',
      issueDate: '2026-06-20',
      dueDate: '2026-07-20',
      companyId: transporte.id,
      projectId: galpao,
    },
  ];

  for (const serviceInvoice of serviceInvoices) {
    const { receiptDate, withholdings, competence, grossAmount, ...rest } =
      serviceInvoice;
    const netAmount = withholdings
      .reduce(
        (acc, withholding) => acc.minus(withholding.amount),
        new Prisma.Decimal(grossAmount),
      )
      .toFixed(2);
    await prisma.receivable.create({
      data: {
        ...rest,
        grossAmount,
        netAmount,
        amount: netAmount,
        competence: new Date(`${competence}-01`),
        issueDate: new Date(rest.issueDate),
        dueDate: new Date(rest.dueDate),
        receiptDate: receiptDate ? new Date(receiptDate) : null,
        status: receiptDate ? PaymentStatus.PAID : PaymentStatus.PENDING,
        withholdings: { create: withholdings },
      },
    });
  }

  const counts = {
    usuários: await prisma.user.count(),
    empresas: await prisma.company.count(),
    obras: await prisma.project.count(),
    categorias: await prisma.category.count(),
    fornecedores: await prisma.supplier.count(),
    boletos: await prisma.bill.count(),
    parcelamentos: await prisma.billGroup.count(),
    faturas: await prisma.invoice.count(),
    notasDeServiço: await prisma.receivable.count(),
    retençõesSofridas: await prisma.receivableWithholding.count(),
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
