import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/test-app';
import { BaseFixtures, createBaseFixtures } from './helpers/fixtures';

describe('Obras: endereço, contrato, prazos e detalhes (/projects)', () => {
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

  it('grava endereço, contrato, prazos e detalhes, com CEP só em dígitos', async () => {
    const response = await server()
      .post('/projects')
      .send({
        name: 'Pavimentação Rua A',
        clientId: fixtures.clientA,
        contractNumber: ' CT-2026/014 ',
        startDate: '2026-03-01',
        expectedEndDate: '2026-12-20',
        zipCode: '13300-000',
        street: 'Rua A',
        streetNumber: 's/n',
        district: 'Centro',
        city: 'Itu',
        state: 'sp',
        details: 'Acesso pelo portão 2. Canteiro funciona das 7h às 17h.',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      contractNumber: 'CT-2026/014',
      zipCode: '13300000',
      streetNumber: 's/n',
      city: 'Itu',
      state: 'SP',
      complement: null,
      details: 'Acesso pelo portão 2. Canteiro funciona das 7h às 17h.',
    });
    expect(response.body.startDate).toContain('2026-03-01');
    expect(response.body.expectedEndDate).toContain('2026-12-20');
  });

  it('continua aceitando obra só com nome e cliente', async () => {
    const response = await server()
      .post('/projects')
      .send({ name: 'Obra Mínima', clientId: fixtures.clientA })
      .expect(201);
    expect(response.body).toMatchObject({
      zipCode: null,
      details: null,
      startDate: null,
    });
  });

  it('recusa CEP, UF e término antes do início', async () => {
    const zip = await server()
      .post('/projects')
      .send({ name: 'Obra X', clientId: fixtures.clientA, zipCode: '1330' })
      .expect(400);
    expect(zip.body.message).toBe('CEP da obra deve ter 8 dígitos');

    const state = await server()
      .post('/projects')
      .send({ name: 'Obra X', clientId: fixtures.clientA, state: 'XX' })
      .expect(400);
    expect(state.body.message).toContain(
      'UF deve ser uma sigla de estado válida',
    );

    const dates = await server()
      .post('/projects')
      .send({
        name: 'Obra X',
        clientId: fixtures.clientA,
        startDate: '2026-05-01',
        expectedEndDate: '2026-04-30',
      })
      .expect(400);
    expect(dates.body.message).toBe(
      'Previsão de término não pode ser anterior à data de início',
    );
    expect(await context.prisma.project.count()).toBe(2);
  });

  it('na edição compara o término com o início já gravado e limpa campos com null', async () => {
    await server()
      .patch(`/projects/${fixtures.projectA}`)
      .send({ startDate: '2026-05-01', details: 'Obra urgente' })
      .expect(200);

    await server()
      .patch(`/projects/${fixtures.projectA}`)
      .send({ expectedEndDate: '2026-04-01' })
      .expect(400);

    const cleared = await server()
      .patch(`/projects/${fixtures.projectA}`)
      .send({ details: null, startDate: null, expectedEndDate: '2026-04-01' })
      .expect(200);
    expect(cleared.body).toMatchObject({ details: null, startDate: null });
  });
});
