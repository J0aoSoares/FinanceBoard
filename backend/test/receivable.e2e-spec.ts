import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/test-app';
import {
  BaseFixtures,
  createBaseFixtures,
  dateFromToday,
  receivablePayload,
} from './helpers/fixtures';

describe('Contas a receber (/receivables)', () => {
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

  it('cadastra um recebível', async () => {
    const response = await server()
      .post('/receivables')
      .send(receivablePayload(fixtures))
      .expect(201);

    expect(response.body).toMatchObject({
      description: 'Medição 01',
      clientName: 'Cliente Alfa',
      status: 'PENDING',
    });
    expect(response.body.amount).toBe('5000');
  });

  it('cadastra recebível sem obra', async () => {
    const response = await server()
      .post('/receivables')
      .send(receivablePayload(fixtures, { projectId: undefined }))
      .expect(201);

    expect(response.body.projectId).toBeNull();
  });

  it('recusa empresa inexistente', async () => {
    await server()
      .post('/receivables')
      .send(receivablePayload(fixtures, { companyId: 'inexistente' }))
      .expect(400);
  });

  it('recusa valor mal formatado', async () => {
    await server()
      .post('/receivables')
      .send(receivablePayload(fixtures, { amount: 5000 }))
      .expect(400);

    await server()
      .post('/receivables')
      .send(receivablePayload(fixtures, { amount: '-100.00' }))
      .expect(400);
  });

  it('marca como OVERDUE recebível vencido', async () => {
    const response = await server()
      .post('/receivables')
      .send(
        receivablePayload(fixtures, {
          issueDate: dateFromToday(-60),
          dueDate: dateFromToday(-10),
        }),
      )
      .expect(201);

    expect(response.body.status).toBe('PENDING');
    expect(response.body.effectiveStatus).toBe('OVERDUE');
  });

  it('registra e estorna recebimento', async () => {
    const created = await server()
      .post('/receivables')
      .send(receivablePayload(fixtures))
      .expect(201);

    const received = await server()
      .post(`/receivables/${created.body.id}/receipt`)
      .send({ receiptDate: '2026-07-02' })
      .expect(200);

    expect(received.body.status).toBe('PAID');
    expect(received.body.receiptDate).toContain('2026-07-02');

    const reverted = await server()
      .delete(`/receivables/${created.body.id}/receipt`)
      .expect(200);

    expect(reverted.body.status).toBe('PENDING');
    expect(reverted.body.receiptDate).toBeNull();
  });

  it('recusa receber duas vezes', async () => {
    const created = await server()
      .post('/receivables')
      .send(receivablePayload(fixtures));
    await server()
      .post(`/receivables/${created.body.id}/receipt`)
      .send({ receiptDate: '2026-07-02' });

    await server()
      .post(`/receivables/${created.body.id}/receipt`)
      .send({ receiptDate: '2026-07-03' })
      .expect(409);
  });

  it('filtra por mês nos dois regimes', async () => {
    const created = await server()
      .post('/receivables')
      .send(
        receivablePayload(fixtures, {
          description: 'Medição Junho',
          issueDate: '2026-06-05',
          dueDate: '2026-07-05',
        }),
      );
    await server()
      .post(`/receivables/${created.body.id}/receipt`)
      .send({ receiptDate: '2026-07-02' });

    const competencia = await server()
      .get('/receivables?month=2026-06&regime=accrual')
      .expect(200);
    expect(competencia.body).toHaveLength(1);

    const caixaJunho = await server()
      .get('/receivables?month=2026-06&regime=cash')
      .expect(200);
    expect(caixaJunho.body).toHaveLength(0);

    const caixaJulho = await server()
      .get('/receivables?month=2026-07&regime=cash')
      .expect(200);
    expect(caixaJulho.body).toHaveLength(1);
  });

  it('retorna 404 para recebível inexistente', async () => {
    await server().get('/receivables/inexistente').expect(404);
  });
});
