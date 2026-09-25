import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/test-app';
import { billPayload, createBaseFixtures } from './helpers/fixtures';

describe('Empresas (/companies)', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  const server = () => context.client;

  it('cadastra uma empresa', async () => {
    const response = await server()
      .post('/companies')
      .send({ legalName: 'Terraplenagem Teste LTDA', cnpj: '11111111000191' })
      .expect(201);

    expect(response.body).toMatchObject({
      legalName: 'Terraplenagem Teste LTDA',
      cnpj: '11111111000191',
    });
    expect(response.body.id).toEqual(expect.any(String));
  });

  it('recusa CNPJ duplicado com 409', async () => {
    await server()
      .post('/companies')
      .send({ legalName: 'Primeira', cnpj: '11111111000191' })
      .expect(201);

    const response = await server()
      .post('/companies')
      .send({ legalName: 'Segunda', cnpj: '11111111000191' })
      .expect(409);

    expect(response.body.message).toBe(
      'Já existe uma empresa cadastrada com esse CNPJ',
    );
  });

  it('recusa CNPJ com pontuação', async () => {
    const response = await server()
      .post('/companies')
      .send({ legalName: 'Teste', cnpj: '11.111.111/0001-91' })
      .expect(400);

    expect(response.body.message).toContain(
      'CNPJ deve conter exatamente 14 dígitos numéricos, sem pontuação',
    );
  });

  it('recusa CNPJ com menos de 14 dígitos', async () => {
    await server()
      .post('/companies')
      .send({ legalName: 'Teste', cnpj: '1111111100019' })
      .expect(400);
  });

  it('recusa razão social vazia', async () => {
    const response = await server()
      .post('/companies')
      .send({ legalName: '', cnpj: '11111111000191' })
      .expect(400);

    expect(response.body.message).toContain('Razão social é obrigatória');
  });

  it('recusa campo desconhecido no corpo', async () => {
    await server()
      .post('/companies')
      .send({
        legalName: 'Teste',
        cnpj: '11111111000191',
        saldoInicial: '1000',
      })
      .expect(400);
  });

  it('lista empresas em ordem alfabética', async () => {
    await server()
      .post('/companies')
      .send({ legalName: 'Zeta LTDA', cnpj: '11111111000191' });
    await server()
      .post('/companies')
      .send({ legalName: 'Alfa LTDA', cnpj: '22222222000172' });

    const response = await server().get('/companies').expect(200);

    expect(
      response.body.map((c: { legalName: string }) => c.legalName),
    ).toEqual(['Alfa LTDA', 'Zeta LTDA']);
  });

  it('retorna 404 para empresa inexistente', async () => {
    const response = await server().get('/companies/inexistente').expect(404);
    expect(response.body.message).toBe('Empresa não encontrada');
  });

  it('atualiza a razão social', async () => {
    const created = await server()
      .post('/companies')
      .send({ legalName: 'Nome Antigo', cnpj: '11111111000191' });

    const response = await server()
      .patch(`/companies/${created.body.id}`)
      .send({ legalName: 'Nome Novo' })
      .expect(200);

    expect(response.body.legalName).toBe('Nome Novo');
    expect(response.body.cnpj).toBe('11111111000191');
  });

  it('remove empresa sem vínculos', async () => {
    const created = await server()
      .post('/companies')
      .send({ legalName: 'Para Remover', cnpj: '11111111000191' });

    await server().delete(`/companies/${created.body.id}`).expect(204);
    await server().get(`/companies/${created.body.id}`).expect(404);
  });

  it('recusa remover empresa com contas vinculadas', async () => {
    const fixtures = await createBaseFixtures(context.prisma);
    await server().post('/bills').send(billPayload(fixtures)).expect(201);

    const response = await server()
      .delete(`/companies/${fixtures.companyA}`)
      .expect(409);

    expect(response.body.message).toBe(
      'Não é possível remover esta empresa: existem contas, faturas ou recebíveis vinculados a ela',
    );
  });
});
