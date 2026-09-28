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
  createLegacyBill,
  installmentsPayload,
  receivablePayload,
} from './helpers/fixtures';

describe('Relatórios (/reports)', () => {
  let context: TestContext;
  let fixtures: BaseFixtures;
  let parceladaIds: string[] = [];

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
          description: 'NF-AVULSA-PAGA',
          amount: '1000.00',
          issueDate: '2026-06-05',
          dueDate: '2026-07-05',
        }),
      )
      .expect(201);
    await server()
      .post(`/bills/${avulsaPaga.body.id}/payment`)
      .send({ paymentDate: '2026-07-03' })
      .expect(200);

    await createLegacyBill(context.prisma, fixtures, {
      documentNumber: 'NF-COM-RETENCAO',
      grossAmount: '2500.00',
      issueDate: '2026-07-10',
      dueDate: '2026-08-10',
      projectId: fixtures.projectB,
      categoryId: fixtures.categoryAlt,
      withholdings: [{ type: 'INSS', amount: '250.00' }],
    });

    await server()
      .post('/bills')
      .send(
        billPayload(fixtures, {
          description: 'NF-SEM-OBRA',
          amount: '500.00',
          issueDate: '2026-06-20',
          dueDate: '2026-07-20',
          companyId: fixtures.companyB,
          projectId: undefined,
        }),
      )
      .expect(201);

    const parcelada = await server()
      .post('/bills/installments')
      .send(
        installmentsPayload(fixtures, {
          documentNumber: 'NF-PARC',
          description: 'NF parcelada',
          totalAmount: '1000.00',
          issueDate: '2026-06-25',
          installments: [
            { label: 'A', dueDate: '2026-07-25', amount: '300.00' },
            { label: 'B', dueDate: '2026-08-25', amount: '700.00' },
          ],
        }),
      )
      .expect(201);
    parceladaIds = parcelada.body.map((bill: { id: string }) => bill.id);
    await server()
      .post(`/bills/${parceladaIds[0]}/payment`)
      .send({ paymentDate: '2026-07-26' })
      .expect(200);

    const recebivel = await server()
      .post('/receivables')
      .send(
        receivablePayload(fixtures, {
          grossAmount: '5000.00',
          issueDate: '2026-06-01',
          dueDate: '2026-07-01',
        }),
      )
      .expect(201);
    await server()
      .post(`/receivables/${recebivel.body.id}/receipt`)
      .send({ receiptDate: '2026-07-15' })
      .expect(200);

    const createNote = async (
      overrides: Record<string, unknown>,
      receiptDate?: string,
    ) => {
      const note = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, overrides))
        .expect(201);
      if (receiptDate) {
        await server()
          .post(`/receivables/${note.body.id}/receipt`)
          .send({ receiptDate })
          .expect(200);
      }
    };

    await createNote(
      {
        number: 'NFS-002',
        grossAmount: '10000.00',
        withholdings: [
          { type: 'INSS', amount: '1100.00' },
          { type: 'ISS', amount: '500.00' },
        ],
        competence: '2026-07',
        issueDate: '2026-07-05',
        dueDate: '2026-08-05',
        projectId: fixtures.projectB,
      },
      '2026-08-10',
    );
    await createNote({
      number: 'NFS-101',
      grossAmount: '4000.00',
      withholdings: [{ type: 'ISS', amount: '200.00' }],
      competence: '2026-08',
      issueDate: '2026-08-01',
      dueDate: '2026-09-01',
      companyId: fixtures.companyB,
    });
    await createNote(
      {
        number: 'NFS-003',
        grossAmount: '2000.00',
        withholdings: [{ type: 'IRRF', amount: '30.00' }],
        competence: '2026-05',
        issueDate: '2026-05-20',
        dueDate: '2026-06-20',
        projectId: fixtures.projectB,
      },
      '2026-06-18',
    );
    await context.prisma.receivable.create({
      data: {
        description: 'Recebível antigo sem obra',
        clientName: 'Cliente Antigo',
        grossAmount: '600.00',
        netAmount: '600.00',
        competence: new Date('2026-09-01'),
        issueDate: new Date('2026-09-01'),
        dueDate: new Date('2026-09-10'),
        receiptDate: new Date('2026-09-05'),
        status: 'PAID',
        companyId: fixtures.companyA,
      },
    });
  });

  interface MonthRow {
    month: string;
    inflow: string;
    inflowGross: string;
    inflowWithholdings: string;
    outflow: string;
    balance: string;
    accumulatedBalance: string;
  }

  const byMonth = (body: { months: MonthRow[] }): Record<string, MonthRow> =>
    Object.fromEntries(body.months.map((m) => [m.month, m]));

  const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09'];

  const sumOf = (rows: { netAmount: string }[]) =>
    rows
      .reduce((acc, row) => acc + Math.round(Number(row.netAmount) * 100), 0)
      .toString();

  const cents = (value: string) => Math.round(Number(value) * 100).toString();

  describe('fluxo de caixa', () => {
    it('em competência usa a competência das NFs de serviço e a emissão dos boletos', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=accrual')
        .expect(200);

      const meses = byMonth(response.body);

      expect(meses['2026-06']).toMatchObject({
        inflow: '5000.00',
        outflow: '2500.00',
        balance: '2500.00',
        accumulatedBalance: '2500.00',
      });
      expect(meses['2026-07']).toMatchObject({
        inflow: '8400.00',
        inflowGross: '10000.00',
        inflowWithholdings: '1600.00',
        outflow: '2250.00',
        accumulatedBalance: '8650.00',
      });
      expect(meses['2026-08']).toMatchObject({
        inflow: '3800.00',
        inflowWithholdings: '200.00',
        outflow: '0.00',
        accumulatedBalance: '12450.00',
      });
      expect(meses['2026-09']).toMatchObject({
        inflow: '600.00',
        outflow: '0.00',
        balance: '600.00',
        accumulatedBalance: '13050.00',
      });

      expect(response.body.totals).toEqual({
        inflow: '17800.00',
        inflowGross: '19600.00',
        inflowWithholdings: '1800.00',
        outflow: '4750.00',
        balance: '13050.00',
      });
      expect(response.body.consolidated).toBe(true);
    });

    it('cada boleto da NF conta pela emissão em competência e pelo próprio pagamento em caixa', async () => {
      const accrual = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=accrual')
        .expect(200);
      expect(byMonth(accrual.body)['2026-06'].outflow).toBe('2500.00');

      const cash = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=cash')
        .expect(200);
      const meses = byMonth(cash.body);
      expect(meses['2026-07'].outflow).toBe('1300.00');
      expect(meses['2026-08'].outflow).toBe('0.00');
    });

    it('não usa a emissão nem o recebimento da NF de serviço em competência', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-05&to=2026-05&regime=accrual')
        .expect(200);

      expect(response.body.totals.inflow).toBe('1970.00');
    });

    it('em caixa conta apenas o que foi efetivamente pago e recebido', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=cash')
        .expect(200);

      const meses = byMonth(response.body);

      expect(meses['2026-06']).toMatchObject({
        inflow: '1970.00',
        inflowWithholdings: '30.00',
        outflow: '0.00',
      });
      expect(meses['2026-07']).toMatchObject({
        inflow: '5000.00',
        outflow: '1300.00',
        balance: '3700.00',
      });
      expect(meses['2026-08']).toMatchObject({ inflow: '8400.00' });
      expect(meses['2026-09']).toMatchObject({
        inflow: '600.00',
        outflow: '0.00',
      });

      expect(response.body.totals).toMatchObject({
        inflow: '15970.00',
        outflow: '1300.00',
        balance: '14670.00',
      });
    });

    it('boleto pago conta no mês do próprio pagamento em caixa', async () => {
      await server()
        .post(`/bills/${parceladaIds[1]}/payment`)
        .send({ paymentDate: '2026-09-02' })
        .expect(200);

      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09&regime=cash')
        .expect(200);

      const meses = byMonth(response.body);
      expect(meses['2026-08'].outflow).toBe('0.00');
      expect(meses['2026-09'].outflow).toBe('700.00');
    });

    it('filtra por empresa e marca consolidated como false', async () => {
      const response = await server()
        .get(
          `/reports/cashflow?from=2026-06&to=2026-09&companyId=${fixtures.companyA}`,
        )
        .expect(200);

      expect(response.body.consolidated).toBe(false);
      expect(byMonth(response.body)['2026-06'].outflow).toBe('2000.00');
      expect(response.body.totals).toMatchObject({
        inflow: '14000.00',
        outflow: '4250.00',
      });
    });

    it('filtra por obra', async () => {
      const response = await server()
        .get(
          `/reports/cashflow?from=2026-06&to=2026-09&projectId=${fixtures.projectB}`,
        )
        .expect(200);

      expect(response.body.totals).toMatchObject({
        inflow: '8400.00',
        outflow: '2250.00',
      });
    });

    it('usa competência como regime padrão', async () => {
      const response = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-09')
        .expect(200);

      expect(response.body.regime).toBe('accrual');
      expect(response.body.totals.outflow).toBe('4750.00');
    });

    it('bate, mês a mês, com as telas de Boletos e de Contas a Receber', async () => {
      const bases = [
        {
          regime: 'accrual',
          bills: 'dateBasis=issue',
          notes: 'dateBasis=competence',
        },
        {
          regime: 'cash',
          bills: 'dateBasis=payment',
          notes: 'dateBasis=receipt',
        },
      ];

      for (const basis of bases) {
        for (const companyId of ['', fixtures.companyA, fixtures.companyB]) {
          const company = companyId ? `&companyId=${companyId}` : '';
          const report = await server()
            .get(
              `/reports/cashflow?from=2026-06&to=2026-09&regime=${basis.regime}${company}`,
            )
            .expect(200);
          const meses = byMonth(report.body);

          for (const month of MONTHS) {
            const bills = await server()
              .get(`/bills?month=${month}&${basis.bills}${company}`)
              .expect(200);
            const notes = await server()
              .get(`/receivables?month=${month}&${basis.notes}${company}`)
              .expect(200);

            expect(cents(meses[month].outflow)).toBe(sumOf(bills.body));
            expect(cents(meses[month].inflow)).toBe(sumOf(notes.body));
          }
        }
      }
    });
  });

  describe('retenções sofridas', () => {
    it('agrupa as retenções das NFs de serviço por empresa, por tipo e por obra', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-06&to=2026-09')
        .expect(200);

      expect(response.body.totals).toEqual({
        invoiceCount: 2,
        total: '1800.00',
        grossAmount: '14000.00',
        netAmount: '12200.00',
        byType: [
          { type: 'INSS', amount: '1100.00' },
          { type: 'ISS', amount: '700.00' },
        ],
      });
      expect(response.body.companies).toEqual([
        {
          companyId: fixtures.companyA,
          legalName: 'Terraplenagem Teste LTDA',
          cnpj: '11111111000191',
          invoiceCount: 1,
          total: '1600.00',
          byType: [
            { type: 'INSS', amount: '1100.00' },
            { type: 'ISS', amount: '500.00' },
          ],
        },
        {
          companyId: fixtures.companyB,
          legalName: 'Transporte Teste LTDA',
          cnpj: '22222222000172',
          invoiceCount: 1,
          total: '200.00',
          byType: [{ type: 'ISS', amount: '200.00' }],
        },
      ]);
      expect(
        response.body.projects.map(
          (project: { name: string; total: string }) =>
            `${project.name}=${project.total}`,
        ),
      ).toEqual(['Obra Beta=1600.00', 'Obra Alfa=200.00']);
    });

    it('lista cada NF de serviço com uma coluna por tipo de retenção', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-06&to=2026-09')
        .expect(200);

      expect(
        response.body.invoices.map(
          (invoice: { number: string }) => invoice.number,
        ),
      ).toEqual(['NFS-002', 'NFS-101']);
      expect(response.body.invoices[0]).toMatchObject({
        projectName: 'Obra Beta',
        clientName: 'Cliente Alfa',
        grossAmount: '10000.00',
        withholdingTotal: '1600.00',
        netAmount: '8400.00',
        amountsByType: {
          INSS: '1100.00',
          ISS: '500.00',
          IRRF: '0.00',
          PIS_COFINS_CSLL: '0.00',
        },
      });
    });

    it('mostra as retenções antigas dos boletos num bloco separado, fora dos totais', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-06&to=2026-09')
        .expect(200);

      expect(response.body.totals.total).toBe('1800.00');
      expect(response.body.legacy.totals).toEqual({
        billCount: 1,
        total: '250.00',
        byType: [{ type: 'INSS', amount: '250.00' }],
      });
      expect(response.body.legacy.bills[0]).toMatchObject({
        documentNumber: 'NF-COM-RETENCAO',
        grossAmount: '2500.00',
        netAmount: '2250.00',
        amountsByType: { INSS: '250.00', ISS: '0.00' },
      });
    });

    it('em caixa usa a data de recebimento da NF de serviço', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-06&to=2026-09&regime=cash')
        .expect(200);

      expect(
        response.body.invoices.map(
          (invoice: { number: string }) => invoice.number,
        ),
      ).toEqual(['NFS-003', 'NFS-002']);
      expect(response.body.totals.total).toBe('1630.00');
    });

    it('não traz nada em período sem retenção', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-10&to=2026-11')
        .expect(200);

      expect(response.body.totals.total).toBe('0.00');
      expect(response.body.invoices).toHaveLength(0);
      expect(response.body.legacy.bills).toHaveLength(0);
    });
  });

  describe('resultado por obra', () => {
    it('calcula receita, recebido no período, custo e resultado de cada obra', async () => {
      const response = await server()
        .get('/reports/project-results?from=2026-06&to=2026-09')
        .expect(200);

      const [beta, alfa] = response.body.projects;
      expect(response.body.projects).toHaveLength(2);
      expect(beta).toMatchObject({
        name: 'Obra Beta',
        revenue: {
          invoiceCount: 1,
          grossAmount: '10000.00',
          withholdingTotal: '1600.00',
          netAmount: '8400.00',
        },
        received: '10370.00',
        outstanding: '0.00',
        result: '7870.00',
      });
      expect(alfa).toMatchObject({
        name: 'Obra Alfa',
        revenue: {
          invoiceCount: 2,
          grossAmount: '9000.00',
          netAmount: '8800.00',
        },
        received: '5000.00',
        outstanding: '3800.00',
        result: '3000.00',
      });
    });

    it('usa o valor bruto das contas antigas e quebra o custo por categoria', async () => {
      const response = await server()
        .get('/reports/project-results?from=2026-06&to=2026-09')
        .expect(200);

      const [beta, alfa] = response.body.projects;
      expect(beta.cost).toEqual({
        billCount: 1,
        total: '2500.00',
        byCategory: [
          {
            categoryId: fixtures.categoryAlt,
            name: 'Locação de Equipamentos',
            billCount: 1,
            total: '2500.00',
          },
        ],
      });
      expect(alfa.cost.byCategory[0]).toMatchObject({
        name: 'Combustível',
        billCount: 3,
        total: '2000.00',
      });
    });

    it('separa despesas administrativas e receitas sem obra, somando no consolidado', async () => {
      const response = await server()
        .get('/reports/project-results?from=2026-06&to=2026-09')
        .expect(200);

      expect(response.body.administrative).toMatchObject({
        billCount: 1,
        total: '500.00',
      });
      expect(response.body.unassignedRevenue).toEqual({
        revenue: {
          invoiceCount: 1,
          grossAmount: '600.00',
          withholdingTotal: '0.00',
          netAmount: '600.00',
        },
        received: '600.00',
        outstanding: '0.00',
      });
      expect(response.body.totals).toEqual({
        revenue: {
          invoiceCount: 4,
          grossAmount: '19600.00',
          withholdingTotal: '1800.00',
          netAmount: '17800.00',
        },
        received: '15970.00',
        outstanding: '3800.00',
        projectCost: '4500.00',
        administrativeCost: '500.00',
        cost: '5000.00',
        result: '10970.00',
      });
    });

    it('em caixa usa o recebimento das NFs de serviço e o pagamento dos boletos', async () => {
      const response = await server()
        .get('/reports/project-results?from=2026-06&to=2026-09&regime=cash')
        .expect(200);

      expect(response.body.totals).toMatchObject({
        received: '15970.00',
        cost: '1300.00',
        result: '14670.00',
      });
    });

    it('filtra por obra', async () => {
      const response = await server()
        .get(
          `/reports/project-results?from=2026-06&to=2026-09&projectId=${fixtures.projectA}`,
        )
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe('Obra Alfa');
      expect(response.body.administrative.total).toBe('0.00');
      expect(response.body.unassignedRevenue).toBeNull();
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
        .get('/reports/project-results?from=2026-09&to=2026-06')
        .expect(400);
    });
  });
});
