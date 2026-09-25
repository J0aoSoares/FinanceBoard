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
  receivablePayload,
} from './helpers/fixtures';

describe('Relatórios (/reports)', () => {
  let context: TestContext;
  let fixtures: BaseFixtures;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  const server = () => context.client;

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    fixtures = await createBaseFixtures(context.prisma);

    const avulsaPaga = await server()
      .post('/bills')
      .send(
        billPayload(fixtures, {
          documentNumber: 'NF-AVULSA-PAGA',
          grossAmount: '1000.00',
          issueDate: '2026-06-05',
          dueDate: '2026-07-05',
        }),
      )
      .expect(201);
    await server()
      .post(`/bills/${avulsaPaga.body.id}/payment`)
      .send({ paymentDate: '2026-07-03' })
      .expect(200);

    await server()
      .post('/bills')
      .send(
        billPayload(fixtures, {
          documentNumber: 'NF-COM-RETENCAO',
          grossAmount: '2500.00',
          issueDate: '2026-07-10',
          dueDate: '2026-08-10',
          projectId: fixtures.projectB,
          categoryId: fixtures.categoryAlt,
          withholdings: [{ type: 'INSS', amount: '250.00' }],
        }),
      )
      .expect(201);

    await server()
      .post('/bills')
      .send(
        billPayload(fixtures, {
          documentNumber: 'NF-SEM-OBRA',
          grossAmount: '500.00',
          issueDate: '2026-06-20',
          dueDate: '2026-07-20',
          companyId: fixtures.companyB,
          projectId: undefined,
        }),
      )
      .expect(201);

    const faturada1 = await server()
      .post('/bills')
      .send(
        billPayload(fixtures, {
          documentNumber: 'NF-FAT-1',
          grossAmount: '300.00',
          issueDate: '2026-06-25',
          dueDate: '2026-07-25',
        }),
      )
      .expect(201);
    const faturada2 = await server()
      .post('/bills')
      .send(
        billPayload(fixtures, {
          documentNumber: 'NF-FAT-2',
          grossAmount: '700.00',
          issueDate: '2026-07-02',
          dueDate: '2026-08-02',
        }),
      )
      .expect(201);

    await server()
      .post('/invoices')
      .send({
        number: 'FAT-001',
        companyId: fixtures.companyA,
        supplierId: fixtures.supplier,
        dueDate: '2026-09-15',
        billIds: [faturada1.body.id, faturada2.body.id],
      })
      .expect(201);

    const recebivel = await server()
      .post('/receivables')
      .send(
        receivablePayload(fixtures, {
          amount: '5000.00',
          issueDate: '2026-06-01',
          dueDate: '2026-07-01',
        }),
      )
      .expect(201);
    await server()
      .post(`/receivables/${recebivel.body.id}/receipt`)
      .send({ receiptDate: '2026-07-15' })
      .expect(200);
  });

  interface MonthRow {
    month: string;
    inflow: string;
    outflow: string;
    outflowGross: string;
    withholdings: string;
    balance: string;
    accumulatedBalance: string;
  }

  const byMonth = (body: { months: MonthRow[] }): Record<string, MonthRow> =>
    Object.fromEntries(body.months.map((m) => [m.month, m]));

  describe('fluxo de caixa', () => {
    it('em competência usa a emissão e desloca as contas faturadas', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=accrual')
        .expect(200);

      const meses = byMonth(response.body);

      expect(meses['2026-06']).toMatchObject({
        inflow: '5000.00',
        outflow: '1500.00',
        balance: '3500.00',
        accumulatedBalance: '3500.00',
      });
      expect(meses['2026-07']).toMatchObject({
        outflow: '2250.00',
        accumulatedBalance: '1250.00',
      });
      expect(meses['2026-08']).toMatchObject({
        inflow: '0.00',
        outflow: '0.00',
        balance: '0.00',
        accumulatedBalance: '1250.00',
      });
      expect(meses['2026-09']).toMatchObject({
        outflow: '1000.00',
        accumulatedBalance: '250.00',
      });

      expect(response.body.totals).toMatchObject({
        inflow: '5000.00',
        outflow: '4750.00',
        outflowGross: '5000.00',
        withholdings: '250.00',
        balance: '250.00',
      });
      expect(response.body.consolidated).toBe(true);
    });

    it('não conta as faturadas no mês de emissão', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=accrual')
        .expect(200);

      const junho = byMonth(response.body)['2026-06'];
      expect(junho.outflow).toBe('1500.00');
      expect(junho.outflow).not.toBe('1800.00');
    });

    it('em caixa conta apenas o que foi efetivamente pago', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=cash')
        .expect(200);

      const meses = byMonth(response.body);

      expect(meses['2026-06']).toMatchObject({
        inflow: '0.00',
        outflow: '0.00',
      });
      expect(meses['2026-07']).toMatchObject({
        inflow: '5000.00',
        outflow: '1000.00',
        balance: '4000.00',
      });
      expect(meses['2026-09']).toMatchObject({ outflow: '0.00' });

      expect(response.body.totals).toMatchObject({
        inflow: '5000.00',
        outflow: '1000.00',
        balance: '4000.00',
      });
    });

    it('leva a fatura paga para o mês do pagamento em caixa', async () => {
      const invoice = await context.prisma.invoice.findFirstOrThrow();
      await server()
        .post(`/invoices/${invoice.id}/payment`)
        .send({ paymentDate: '2026-09-12' })
        .expect(200);

      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=cash')
        .expect(200);

      expect(byMonth(response.body)['2026-09'].outflow).toBe('1000.00');
    });

    it('filtra por empresa e marca consolidated como false', async () => {
      const response = await server()
        .get(
          `/reports/cashflow?from=2026-06&to=2026-09&companyId=${fixtures.companyA}`,
        )
        .expect(200);

      expect(response.body.consolidated).toBe(false);
      expect(byMonth(response.body)['2026-06'].outflow).toBe('1000.00');
      expect(response.body.totals.outflow).toBe('4250.00');
    });

    it('filtra por obra', async () => {
      const response = await server()
        .get(
          `/reports/cashflow?from=2026-06&to=2026-09&projectId=${fixtures.projectB}`,
        )
        .expect(200);

      expect(response.body.totals.outflow).toBe('2250.00');
    });

    it('usa competência como regime padrão', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09')
        .expect(200);

      expect(response.body.regime).toBe('accrual');
      expect(response.body.totals.outflow).toBe('4750.00');
    });
  });

  describe('retenções', () => {
    it('agrupa por empresa e por tipo de imposto', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-06&to=2026-09')
        .expect(200);

      expect(response.body.totals).toMatchObject({
        billCount: 1,
        total: '250.00',
      });
      expect(response.body.totals.byType).toEqual([
        { type: 'INSS', amount: '250.00' },
      ]);
      expect(response.body.companies).toHaveLength(1);
      expect(response.body.companies[0]).toMatchObject({
        legalName: 'Terraplenagem Teste LTDA',
        billCount: 1,
        total: '250.00',
      });
      expect(response.body.bills).toHaveLength(1);
      expect(response.body.bills[0].documentNumber).toBe('NF-COM-RETENCAO');
    });

    it('não traz nada em período sem retenção', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-10&to=2026-11')
        .expect(200);

      expect(response.body.totals.total).toBe('0.00');
      expect(response.body.bills).toHaveLength(0);
    });
  });

  describe('custo por obra', () => {
    it('usa o valor bruto, ordena por custo e separa despesas sem obra', async () => {
      const response = await server()
        .get('/reports/project-costs?from=2026-06&to=2026-09')
        .expect(200);

      const nomes = response.body.projects.map((p: { name: string }) => p.name);
      expect(nomes).toEqual([
        'Obra Beta',
        'Obra Alfa',
        'Despesas administrativas (sem obra)',
      ]);

      const [beta, alfa, admin] = response.body.projects;
      expect(beta).toMatchObject({
        grossTotal: '2500.00',
        netTotal: '2250.00',
      });
      expect(alfa.grossTotal).toBe('2000.00');
      expect(admin.grossTotal).toBe('500.00');

      expect(response.body.totals).toMatchObject({
        billCount: 5,
        grossTotal: '5000.00',
        netTotal: '4750.00',
      });
    });

    it('calcula a participação percentual de cada obra', async () => {
      const response = await server()
        .get('/reports/project-costs?from=2026-06&to=2026-09')
        .expect(200);

      const shares = response.body.projects.map(
        (p: { shareOfTotal: string }) => p.shareOfTotal,
      );
      expect(shares).toEqual(['50.00', '40.00', '10.00']);
    });

    it('quebra o custo da obra por categoria', async () => {
      const response = await server()
        .get('/reports/project-costs?from=2026-06&to=2026-09')
        .expect(200);

      const alfa = response.body.projects.find(
        (p: { name: string }) => p.name === 'Obra Alfa',
      );
      const combustivel = alfa.byCategory.find(
        (c: { name: string }) => c.name === 'Combustível',
      );

      expect(combustivel).toMatchObject({
        billCount: 3,
        grossTotal: '2000.00',
      });
    });
  });

  describe('validação de período', () => {
    it('recusa período invertido', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-09&to=2026-06')
        .expect(400);

      expect(response.body.message).toBe(
        'Mês inicial não pode ser posterior ao mês final',
      );
    });

    it('recusa período maior que 36 meses', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2020-01&to=2026-12')
        .expect(400);

      expect(response.body.message).toBe(
        'O período do relatório não pode exceder 36 meses',
      );
    });

    it('recusa mês mal formatado e ausência de período', async () => {
      await server()
        .get('/reports/cashflow?from=06-2026&to=2026-09')
        .expect(400);
      await server().get('/reports/cashflow').expect(400);
    });

    it('recusa regime inválido', async () => {
      await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=competencia')
        .expect(400);
    });

    it('aplica as mesmas validações nos três relatórios', async () => {
      await server()
        .get('/reports/withholdings?from=2026-09&to=2026-06')
        .expect(400);
      await server()
        .get('/reports/project-costs?from=2026-09&to=2026-06')
        .expect(400);
    });
  });
});
