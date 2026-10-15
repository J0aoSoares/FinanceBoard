import { nameKey } from '../src/common/name-key.util';
import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/test-app';
import {
  BaseFixtures,
  billPayload,
  createBaseFixtures,
  installmentsPayload,
} from './helpers/fixtures';

describe('Boletos: aviso de NF já cadastrada (/bills/duplicates)', () => {
  let context: TestContext;
  let fixtures: BaseFixtures;

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    fixtures = await createBaseFixtures(context.prisma);
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  const server = () => context.client;

  const duplicates = (
    documentNumber: string,
    extra: Record<string, string> = {},
  ) =>
    server()
      .get('/bills/duplicates')
      .query({ supplierId: fixtures.supplier, documentNumber, ...extra });

  it('não acusa nada quando a NF ainda não existe', async () => {
    await server()
      .post('/bills')
      .send(billPayload(fixtures, { documentNumber: 'NF-2000' }))
      .expect(201);

    const response = await duplicates('NF-1088').expect(200);
    expect(response.body).toEqual([]);
  });

  it('acha a NF do mesmo fornecedor mesmo com prefixo, espaços, zeros ou maiúsculas diferentes', async () => {
    await server()
      .post('/bills/installments')
      .send(installmentsPayload(fixtures, { documentNumber: 'NF-1088' }))
      .expect(201);

    for (const typed of ['NF-1088', 'nf 1088', '1088', '001088', 'NFe 1088']) {
      const response = await duplicates(typed).expect(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          documentNumber: 'NF-1088',
          billCount: 3,
          totalAmount: '1000.00',
          companyName: 'Terraplenagem Teste LTDA',
        }),
      ]);
    }

    await duplicates('10880').expect(200).expect([]);
  });

  it('ignora NFs de outro fornecedor e boletos sem NF', async () => {
    const other = await context.prisma.supplier.create({
      data: { name: 'Outro Fornecedor', nameKey: nameKey('Outro Fornecedor') },
    });
    await server()
      .post('/bills')
      .send(
        billPayload(fixtures, {
          documentNumber: 'NF-1088',
          supplierId: other.id,
        }),
      )
      .expect(201);
    await server()
      .post('/bills')
      .send(billPayload(fixtures, { documentNumber: undefined }))
      .expect(201);

    const response = await duplicates('NF-1088').expect(200);
    expect(response.body).toEqual([]);
  });

  it('ao editar, não acusa a própria NF nem os boletos do mesmo grupo', async () => {
    const group = await server()
      .post('/bills/installments')
      .send(installmentsPayload(fixtures, { documentNumber: 'NF-1088' }))
      .expect(201);
    const single = await server()
      .post('/bills')
      .send(billPayload(fixtures, { documentNumber: 'NF-1088' }))
      .expect(201);

    const fromGroup = await duplicates('NF-1088', {
      excludeBillId: group.body[1].id,
    }).expect(200);
    expect(fromGroup.body).toEqual([
      expect.objectContaining({ groupId: null, billCount: 1 }),
    ]);

    const fromSingle = await duplicates('NF-1088', {
      excludeBillId: single.body.id,
    }).expect(200);
    expect(fromSingle.body).toEqual([
      expect.objectContaining({
        groupId: group.body[0].group.id,
        billCount: 3,
      }),
    ]);
  });

  it('exige fornecedor e número', async () => {
    const response = await server().get('/bills/duplicates').expect(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Fornecedor é obrigatório',
        'Número da NF é obrigatório',
      ]),
    );
  });
});
