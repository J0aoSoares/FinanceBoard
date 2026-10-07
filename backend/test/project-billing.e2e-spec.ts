import { UserRole } from '@prisma/client';
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
} from './helpers/fixtures';

type Banks = { itau: string; bb: string; santander: string };

describe('Faturas (/project-billings) e devoluções de caução (/retainage-releases)', () => {
  let context: TestContext;
  let fixtures: BaseFixtures;
  let banks: Banks;

  beforeAll(async () => {
    context = await createTestApp();
    const byCode = async (code: string) =>
      (await context.prisma.bank.findUniqueOrThrow({ where: { code } })).id;
    banks = {
      itau: await byCode('341'),
      bb: await byCode('001'),
      santander: await byCode('033'),
    };
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    fixtures = await createBaseFixtures(context.prisma);
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  const server = () => context.client;

  const payload = (overrides: Record<string, unknown> = {}) => ({
    number: 'FAT-001',
    companyId: fixtures.companyA,
    projectId: fixtures.projectA,
    amount: '10000.00',
    dueDate: '2026-06-15',
    ...overrides,
  });

  const createBilling = async (overrides: Record<string, unknown> = {}) =>
    (
      await server()
        .post('/project-billings')
        .send(payload(overrides))
        .expect(201)
    ).body;

  const release = (overrides: Record<string, unknown> = {}) =>
    server()
      .post('/retainage-releases')
      .send({
        projectId: fixtures.projectA,
        companyId: fixtures.companyA,
        amount: '500.00',
        returnDate: '2026-08-10',
        bankId: banks.bb,
        ...overrides,
      });

  const balanceOf = async (projectId: string) =>
    (
      await server()
        .get(`/retainage-releases?projectId=${projectId}`)
        .expect(200)
    ).body;

  describe('cadastro', () => {
    it('calcula o líquido no backend descontando a caução', async () => {
      const billing = await createBilling({ retainageAmount: '500.00' });

      expect(billing).toMatchObject({
        number: 'FAT-001',
        amount: '10000.00',
        retainageAmount: '500.00',
        retainagePercent: null,
        netAmount: '9500.00',
        paymentDate: null,
        bankId: null,
      });
      expect(billing.project.name).toBe('Obra Alfa');
    });

    it('ignora líquido enviado pelo cliente', async () => {
      const response = await server()
        .post('/project-billings')
        .send(payload({ netAmount: '1.00' }))
        .expect(400);
      expect(response.body.message).toContain(
        'property netAmount should not exist',
      );
    });

    it('recusa número duplicado na mesma empresa e aceita em empresa diferente', async () => {
      await createBilling();

      const duplicated = await server()
        .post('/project-billings')
        .send(payload())
        .expect(409);
      expect(duplicated.body.message).toBe(
        'Já existe uma fatura com esse número nesta empresa',
      );

      const other = await createBilling({ companyId: fixtures.companyB });
      expect(other.number).toBe('FAT-001');
    });

    it('exige obra, empresa, número, valor positivo e vencimento', async () => {
      const response = await server()
        .post('/project-billings')
        .send({ amount: '0.00' })
        .expect(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'Número da fatura é obrigatório',
          'Empresa emissora é obrigatória',
          'Obra é obrigatória',
          'Data de vencimento deve estar no formato aaaa-mm-dd',
        ]),
      );

      const zero = await server()
        .post('/project-billings')
        .send(payload({ amount: '0.00' }))
        .expect(400);
      expect(zero.body.message).toBe('Valor da fatura deve ser maior que zero');
    });

    it('lança fatura antiga já paga', async () => {
      const billing = await createBilling({
        paymentDate: '2026-06-20',
        bankId: banks.itau,
      });

      expect(billing.paymentDate).toContain('2026-06-20');
      expect(billing.bank.name).toBe('Itaú');
      expect(billing.effectiveStatus).toBe('PAID');
    });
  });

  describe('pagamento e banco', () => {
    it('recusa data sem banco e banco sem data', async () => {
      for (const partial of [
        { paymentDate: '2026-06-20' },
        { bankId: banks.itau },
      ]) {
        const response = await server()
          .post('/project-billings')
          .send(payload(partial))
          .expect(400);
        expect(response.body.message).toBe(
          'Data de pagamento e banco devem ser informados juntos',
        );
      }

      const billing = await createBilling();
      const withoutBank = await server()
        .post(`/project-billings/${billing.id}/payment`)
        .send({ paymentDate: '2026-06-20' })
        .expect(400);
      expect(withoutBank.body.message).toContain(
        'Banco é obrigatório para registrar o pagamento',
      );
    });

    it('recusa data de pagamento futura', async () => {
      const created = await server()
        .post('/project-billings')
        .send(payload({ paymentDate: dateFromToday(1), bankId: banks.itau }))
        .expect(400);
      expect(created.body.message).toBe(
        'Data de pagamento não pode ser futura',
      );

      const billing = await createBilling();
      const paid = await server()
        .post(`/project-billings/${billing.id}/payment`)
        .send({ paymentDate: dateFromToday(1), bankId: banks.itau })
        .expect(400);
      expect(paid.body.message).toBe('Data de pagamento não pode ser futura');

      await server()
        .post(`/project-billings/${billing.id}/payment`)
        .send({ paymentDate: dateFromToday(0), bankId: banks.itau })
        .expect(200);
    });

    it('recusa banco inexistente', async () => {
      const billing = await createBilling();
      const response = await server()
        .post(`/project-billings/${billing.id}/payment`)
        .send({ paymentDate: '2026-06-20', bankId: 'inexistente' })
        .expect(400);
      expect(response.body.message).toBe('Banco informado não existe');
    });

    it('registra pagamento e estorna limpando data e banco', async () => {
      const billing = await createBilling({ retainageAmount: '500.00' });

      const paid = await server()
        .post(`/project-billings/${billing.id}/payment`)
        .send({ paymentDate: '2026-06-20', bankId: banks.santander })
        .expect(200);
      expect(paid.body.bankId).toBe(banks.santander);
      expect(paid.body.effectiveStatus).toBe('PAID');

      await server()
        .post(`/project-billings/${billing.id}/payment`)
        .send({ paymentDate: '2026-06-21', bankId: banks.itau })
        .expect(409);

      const reverted = await server()
        .delete(`/project-billings/${billing.id}/payment`)
        .expect(200);
      expect(reverted.body.paymentDate).toBeNull();
      expect(reverted.body.bankId).toBeNull();
      expect(reverted.body.bank).toBeNull();

      await server()
        .delete(`/project-billings/${billing.id}/payment`)
        .expect(409);
    });

    it('recusa excluir fatura paga e exclui a pendente', async () => {
      const billing = await createBilling({
        paymentDate: '2026-06-20',
        bankId: banks.itau,
      });

      const response = await server()
        .delete(`/project-billings/${billing.id}`)
        .expect(409);
      expect(response.body.message).toBe(
        'Não é possível excluir uma fatura paga; estorne o pagamento antes',
      );

      await server().delete(`/project-billings/${billing.id}/payment`);
      await server().delete(`/project-billings/${billing.id}`).expect(204);
      await server().get(`/project-billings/${billing.id}`).expect(404);
    });

    it('fatura paga não aceita mudar valor nem caução, mas aceita o vencimento', async () => {
      const billing = await createBilling({
        retainageAmount: '500.00',
        paymentDate: '2026-06-20',
        bankId: banks.itau,
      });

      for (const change of [
        { amount: '9000.00' },
        { retainageAmount: '400.00' },
        { retainagePercent: '3' },
      ]) {
        const response = await server()
          .patch(`/project-billings/${billing.id}`)
          .send(change)
          .expect(409);
        expect(response.body.message).toBe(
          'Fatura paga não pode ter valor nem caução alterados; estorne o pagamento antes',
        );
      }

      const updated = await server()
        .patch(`/project-billings/${billing.id}`)
        .send({ dueDate: '2026-06-30', amount: '10000.00' })
        .expect(200);
      expect(updated.body.dueDate).toContain('2026-06-30');
      expect(updated.body.netAmount).toBe('9500.00');
    });
  });

  describe('caução', () => {
    it('recusa caução maior ou igual ao valor da fatura', async () => {
      for (const retainageAmount of ['10000.00', '10000.01']) {
        const response = await server()
          .post('/project-billings')
          .send(payload({ retainageAmount }))
          .expect(400);
        expect(response.body.message).toBe(
          'Caução deve ser menor que o valor da fatura',
        );
      }
    });

    it('calcula a caução por percentual arredondando para o centavo mais próximo', async () => {
      const cases = [
        { amount: '10.10', percent: '5', expected: '0.51' },
        { amount: '333.33', percent: '7.5', expected: '25.00' },
        { amount: '1000.05', percent: '2.5', expected: '25.00' },
        { amount: '1234.56', percent: '10', expected: '123.46' },
        { amount: '99.99', percent: '0.01', expected: '0.01' },
      ];
      for (const [index, item] of cases.entries()) {
        const billing = await createBilling({
          number: `FAT-P${index}`,
          amount: item.amount,
          retainagePercent: item.percent,
        });
        expect(billing.retainageAmount).toBe(item.expected);
        expect(billing.retainagePercent).toBe(Number(item.percent).toFixed(2));
      }
    });

    it('recusa percentual e valor juntos', async () => {
      const response = await server()
        .post('/project-billings')
        .send(payload({ retainageAmount: '100.00', retainagePercent: '5' }))
        .expect(400);
      expect(response.body.message).toBe(
        'Informe a caução em percentual ou em valor, não os dois',
      );
    });

    it('recalcula a caução pelo percentual guardado quando o valor muda', async () => {
      const billing = await createBilling({ retainagePercent: '5' });
      const updated = await server()
        .patch(`/project-billings/${billing.id}`)
        .send({ amount: '20000.00' })
        .expect(200);
      expect(updated.body.retainageAmount).toBe('1000.00');
      expect(updated.body.netAmount).toBe('19000.00');
    });
  });

  describe('devolução de caução', () => {
    it('recusa devolução acima do saldo e estorno restaura o saldo', async () => {
      await createBilling({ retainageAmount: '500.00' });
      await createBilling({ number: 'FAT-002', retainageAmount: '300.00' });

      const tooMuch = await release({ amount: '800.01' }).expect(400);
      expect(tooMuch.body.message).toBe(
        'Devolução maior que o saldo de caução retido desta obra nesta empresa (saldo: 800.00)',
      );

      const created = await release({ amount: '800.00' }).expect(201);
      expect(created.body.bank.name).toBe('Banco do Brasil');
      expect(await balanceOf(fixtures.projectA)).toMatchObject({
        withheld: '800.00',
        released: '800.00',
        balance: '0.00',
      });

      await release({ amount: '0.01' }).expect(400);

      await server()
        .delete(`/retainage-releases/${created.body.id}`)
        .expect(204);
      const restored = await balanceOf(fixtures.projectA);
      expect(restored).toMatchObject({ released: '0.00', balance: '800.00' });
      expect(restored.releases).toEqual([]);
    });

    it('separa o saldo por empresa emissora', async () => {
      await createBilling({ retainageAmount: '500.00' });
      await createBilling({
        companyId: fixtures.companyB,
        retainageAmount: '200.00',
      });

      const response = await release({
        companyId: fixtures.companyB,
        amount: '300.00',
      }).expect(400);
      expect(response.body.message).toContain('(saldo: 200.00)');

      const balance = await balanceOf(fixtures.projectA);
      expect(balance.balance).toBe('700.00');
      expect(balance.companies).toHaveLength(2);
    });

    it('recusa devolução com data futura', async () => {
      await createBilling({ retainageAmount: '500.00' });
      const response = await release({ returnDate: dateFromToday(1) }).expect(
        400,
      );
      expect(response.body.message).toBe(
        'Data da devolução não pode ser futura',
      );
    });

    it('recusa excluir fatura ou reduzir caução se a devolução ficar maior que o retido', async () => {
      const billing = await createBilling({ retainageAmount: '500.00' });
      await release({ amount: '400.00' }).expect(201);

      const removal = await server()
        .delete(`/project-billings/${billing.id}`)
        .expect(409);
      expect(removal.body.message).toBe(
        'Operação recusada: a caução já devolvida nesta obra (400.00) ficaria maior que a caução retida (0.00)',
      );

      await server()
        .patch(`/project-billings/${billing.id}`)
        .send({ retainageAmount: '300.00' })
        .expect(409);
      await server()
        .patch(`/project-billings/${billing.id}`)
        .send({ projectId: fixtures.projectB })
        .expect(409);

      await server()
        .patch(`/project-billings/${billing.id}`)
        .send({ retainageAmount: '400.00' })
        .expect(200);
      expect(await context.prisma.projectBilling.count()).toBe(1);
    });
  });

  describe('status derivado', () => {
    it('marca PAID, OVERDUE e PENDING pela data de hoje e filtra por status', async () => {
      await createBilling({
        number: 'PAGA',
        dueDate: dateFromToday(-10),
        paymentDate: dateFromToday(-1),
        bankId: banks.itau,
      });
      await createBilling({ number: 'VENCIDA', dueDate: dateFromToday(-1) });
      await createBilling({ number: 'HOJE', dueDate: dateFromToday(0) });

      const all = await server().get('/project-billings').expect(200);
      const statusOf = Object.fromEntries(
        all.body.map((billing: { number: string; effectiveStatus: string }) => [
          billing.number,
          billing.effectiveStatus,
        ]),
      );
      expect(statusOf).toEqual({
        PAGA: 'PAID',
        VENCIDA: 'OVERDUE',
        HOJE: 'PENDING',
      });

      for (const [status, number] of [
        ['PAID', 'PAGA'],
        ['OVERDUE', 'VENCIDA'],
        ['PENDING', 'HOJE'],
      ]) {
        const response = await server()
          .get(`/project-billings?status=${status}`)
          .expect(200);
        expect(response.body.map((b: { number: string }) => b.number)).toEqual([
          number,
        ]);
      }
    });
  });

  describe('listagem e totais', () => {
    beforeEach(async () => {
      await createBilling({
        number: 'F-JUN',
        retainageAmount: '500.00',
        dueDate: '2026-06-15',
        paymentDate: '2026-07-05',
        bankId: banks.itau,
      });
      await createBilling({
        number: 'F-JUL',
        amount: '4000.00',
        dueDate: '2026-07-10',
        paymentDate: '2026-07-12',
        bankId: banks.santander,
      });
      await createBilling({
        number: 'F-JUL-B',
        amount: '1000.00',
        retainageAmount: '100.00',
        dueDate: '2026-07-20',
      });
      await release({
        amount: '300.00',
        returnDate: '2026-07-25',
        bankId: banks.itau,
      }).expect(201);
    });

    const numbers = (body: { number: string }[]) =>
      body.map((billing) => billing.number).sort();

    it('filtra o mês pelo vencimento por padrão e pelo pagamento quando pedido', async () => {
      const byDue = await server()
        .get('/project-billings?month=2026-07')
        .expect(200);
      expect(numbers(byDue.body)).toEqual(['F-JUL', 'F-JUL-B']);

      const byPayment = await server()
        .get('/project-billings?month=2026-07&dateBasis=payment')
        .expect(200);
      expect(numbers(byPayment.body)).toEqual(['F-JUL', 'F-JUN']);

      const byBank = await server()
        .get(`/project-billings?bankId=${banks.itau}`)
        .expect(200);
      expect(numbers(byBank.body)).toEqual(['F-JUN']);
    });

    it('soma pagamentos e devoluções por banco respeitando os filtros', async () => {
      const summary = await server()
        .get('/project-billings/summary?month=2026-07&dateBasis=payment')
        .expect(200);

      expect(summary.body).toMatchObject({
        billingCount: 2,
        invoiced: '14000.00',
        retainage: '500.00',
        received: '13500.00',
        retainageReleased: '300.00',
        totalReceived: '13800.00',
        receivedByBank: [
          {
            bankName: 'Itaú',
            billings: '9500.00',
            retainageReleases: '300.00',
            total: '9800.00',
          },
          {
            bankName: 'Santander',
            billings: '4000.00',
            retainageReleases: '0.00',
            total: '4000.00',
          },
        ],
      });

      const itau = await server()
        .get(
          `/project-billings/summary?month=2026-07&dateBasis=payment&bankId=${banks.itau}`,
        )
        .expect(200);
      expect(itau.body.receivedByBank).toEqual([
        expect.objectContaining({ bankName: 'Itaú', total: '9800.00' }),
      ]);

      const pending = await server()
        .get('/project-billings/summary?status=PENDING')
        .expect(200);
      expect(pending.body).toMatchObject({
        received: '0.00',
        retainageReleased: '0.00',
        receivedByBank: [],
      });

      const otherCompany = await server()
        .get(`/project-billings/summary?companyId=${fixtures.companyB}`)
        .expect(200);
      expect(otherCompany.body).toMatchObject({
        billingCount: 0,
        retainageReleased: '0.00',
      });
    });
  });

  describe('relatórios', () => {
    beforeEach(async () => {
      await createBilling({
        retainageAmount: '500.00',
        dueDate: '2026-06-15',
        paymentDate: '2026-07-05',
        bankId: banks.itau,
      });
      await release({ amount: '500.00', returnDate: '2026-08-10' }).expect(201);
    });

    const cashflow = async (regime: string) => {
      const response = await server()
        .get(`/reports/cashflow?from=2026-06&to=2026-08&regime=${regime}`)
        .expect(200);
      return Object.fromEntries(
        response.body.months.map((month: { month: string }) => [
          month.month,
          month,
        ]),
      );
    };

    it('fluxo de caixa usa o líquido da fatura e a devolução no mês dela', async () => {
      const accrual = await cashflow('accrual');
      expect(accrual['2026-06']).toMatchObject({
        inflow: '9500.00',
        inflowWithholdings: '0.00',
      });
      expect(accrual['2026-07']).toMatchObject({ inflow: '0.00' });
      expect(accrual['2026-08']).toMatchObject({ inflow: '500.00' });

      const cash = await cashflow('cash');
      expect(cash['2026-06']).toMatchObject({ inflow: '0.00' });
      expect(cash['2026-07']).toMatchObject({ inflow: '9500.00' });
      expect(cash['2026-08']).toMatchObject({ inflow: '500.00' });

      const totals = await server()
        .get('/reports/cashflow?from=2026-06&to=2026-08&regime=cash')
        .expect(200);
      expect(totals.body.projectBillingInflows.totals).toEqual({
        projectBillings: '9500.00',
        retainageReleases: '500.00',
      });
    });

    it('resultado da obra soma o valor cheio e mostra a caução ainda não devolvida', async () => {
      const untilJuly = await server()
        .get('/reports/project-results?from=2026-06&to=2026-07')
        .expect(200);
      const alfaJuly = untilJuly.body.projects.find(
        (project: { name: string }) => project.name === 'Obra Alfa',
      );
      expect(alfaJuly).toMatchObject({
        revenue: {
          invoiceCount: 1,
          grossAmount: '10000.00',
          withholdingTotal: '0.00',
          netAmount: '10000.00',
        },
        received: '9500.00',
        retainage: { withheld: '500.00', released: '0.00', balance: '500.00' },
      });
      expect(untilJuly.body.retainageTotals.balance).toBe('500.00');

      const untilAugust = await server()
        .get('/reports/project-results?from=2026-06&to=2026-08')
        .expect(200);
      const alfaAugust = untilAugust.body.projects.find(
        (project: { name: string }) => project.name === 'Obra Alfa',
      );
      expect(alfaAugust).toMatchObject({
        received: '10000.00',
        retainage: { withheld: '500.00', released: '500.00', balance: '0.00' },
      });
    });

    it('retenções não incluem faturas nem caução', async () => {
      const response = await server()
        .get('/reports/withholdings?from=2026-06&to=2026-08')
        .expect(200);
      expect(response.body.invoices).toEqual([]);
      expect(response.body.totals.total).toBe('0.00');
    });
  });

  describe('obra', () => {
    it('não remove obra com faturas', async () => {
      await createBilling();
      const response = await server()
        .delete(`/projects/${fixtures.projectA}`)
        .expect(409);
      expect(response.body.message).toContain('faturas');
    });
  });

  describe('perfil VIEWER', () => {
    let viewer: TestContext;

    beforeAll(async () => {
      viewer = await createTestApp(UserRole.VIEWER);
    });

    afterAll(async () => {
      await closeTestApp(viewer);
    });

    it('lê faturas, bancos e devoluções mas não escreve', async () => {
      const billing = await createBilling({ retainageAmount: '500.00' });

      await viewer.client.get('/project-billings').expect(200);
      await viewer.client.get('/project-billings/summary').expect(200);
      await viewer.client.get('/banks').expect(200);
      await viewer.client
        .get(`/retainage-releases?projectId=${fixtures.projectA}`)
        .expect(200);

      const blocked = [
        () =>
          viewer.client
            .post('/project-billings')
            .send(payload({ number: 'X' })),
        () =>
          viewer.client
            .patch(`/project-billings/${billing.id}`)
            .send({ dueDate: '2026-06-30' }),
        () => viewer.client.delete(`/project-billings/${billing.id}`),
        () =>
          viewer.client
            .post(`/project-billings/${billing.id}/payment`)
            .send({ paymentDate: '2026-06-20', bankId: banks.itau }),
        () =>
          viewer.client.post('/retainage-releases').send({
            projectId: fixtures.projectA,
            companyId: fixtures.companyA,
            amount: '100.00',
            returnDate: '2026-06-20',
            bankId: banks.itau,
          }),
      ];
      for (const request of blocked) {
        const response = await request().expect(403);
        expect(response.body.message).toBe(
          'Perfil somente leitura: não é possível criar, alterar ou remover registros',
        );
      }
    });
  });

  it('lista os três bancos cadastrados', async () => {
    const response = await server().get('/banks').expect(200);
    expect(
      response.body.map(
        (bank: { name: string; code: string }) => `${bank.code} ${bank.name}`,
      ),
    ).toEqual(['001 Banco do Brasil', '341 Itaú', '033 Santander']);
  });
});
