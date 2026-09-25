import * as request from 'supertest';
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
} from './helpers/fixtures';

describe('Faturas (/invoices)', () => {
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

  const createBill = async (overrides: Record<string, unknown> = {}) => {
    const response = await server()
      .post('/bills')
      .send(billPayload(fixtures, overrides))
      .expect(201);
    return response.body;
  };

  const createInvoice = (
    billIds: string[],
    overrides: Record<string, unknown> = {},
  ): request.Test =>
    server()
      .post('/invoices')
      .send({
        number: 'FAT-001',
        companyId: fixtures.companyA,
        supplierId: fixtures.supplier,
        dueDate: '2026-09-15',
        billIds,
        ...overrides,
      });

  it('agrupa contas de meses diferentes e soma os totais', async () => {
    const junho = await createBill({
      documentNumber: 'NF-JUN',
      grossAmount: '4800.00',
      issueDate: '2026-06-10',
      dueDate: '2026-07-10',
    });
    const julho = await createBill({
      documentNumber: 'NF-JUL',
      grossAmount: '5200.00',
      issueDate: '2026-07-10',
      dueDate: '2026-08-10',
    });
    const agosto = await createBill({
      documentNumber: 'NF-AGO',
      grossAmount: '3100.00',
      issueDate: '2026-08-05',
      dueDate: '2026-09-05',
    });

    const response = await createInvoice([
      junho.id,
      julho.id,
      agosto.id,
    ]).expect(201);

    expect(response.body.billCount).toBe(3);
    expect(response.body.grossTotal).toBe('13100.00');
    expect(response.body.netTotal).toBe('13100.00');
    expect(response.body.withholdingTotal).toBe('0.00');
    expect(response.body.status).toBe('PENDING');
  });

  it('soma as retenções das contas no total da fatura', async () => {
    const bill = await createBill({
      grossAmount: '10000.00',
      withholdings: [{ type: 'INSS', amount: '1100.00' }],
    });

    const response = await createInvoice([bill.id]).expect(201);

    expect(response.body.grossTotal).toBe('10000.00');
    expect(response.body.withholdingTotal).toBe('1100.00');
    expect(response.body.netTotal).toBe('8900.00');
  });

  it('faz a conta herdar vencimento e status da fatura', async () => {
    const bill = await createBill({
      issueDate: '2026-06-10',
      dueDate: '2026-07-10',
    });

    await createInvoice([bill.id], { dueDate: '2026-09-15' }).expect(201);

    const response = await server().get(`/bills/${bill.id}`).expect(200);

    expect(response.body.effectiveDueDate).toContain('2026-09-15');
    expect(response.body.dueDate).toContain('2026-07-10');
  });

  it('recusa contas de outra empresa', async () => {
    const outra = await createBill({ companyId: fixtures.companyB });

    const response = await createInvoice([outra.id]).expect(400);

    expect(response.body.message).toBe(
      'Todas as contas da fatura devem pertencer à mesma empresa da fatura',
    );
  });

  it('recusa conta já vinculada a outra fatura', async () => {
    const bill = await createBill();
    await createInvoice([bill.id]).expect(201);

    const response = await createInvoice([bill.id], {
      number: 'FAT-002',
    }).expect(409);

    expect(response.body.message).toBe(
      'Uma ou mais contas já pertencem a outra fatura',
    );
  });

  it('recusa conta já paga individualmente', async () => {
    const bill = await createBill();
    await server()
      .post(`/bills/${bill.id}/payment`)
      .send({ paymentDate: '2026-07-08' })
      .expect(200);

    const response = await createInvoice([bill.id]).expect(409);

    expect(response.body.message).toBe(
      'Não é possível faturar uma conta que já foi paga',
    );
  });

  it('recusa id repetido e lista vazia', async () => {
    const bill = await createBill();

    const repetido = await createInvoice([bill.id, bill.id]).expect(400);
    expect(repetido.body.message).toBe(
      'A mesma conta foi informada mais de uma vez',
    );

    const vazia = await createInvoice([]).expect(400);
    expect(vazia.body.message).toContain(
      'A fatura deve conter ao menos uma conta',
    );
  });

  it('recusa conta inexistente', async () => {
    await createInvoice(['inexistente']).expect(400);
  });

  it('bloqueia o pagamento individual de conta faturada', async () => {
    const bill = await createBill();
    await createInvoice([bill.id]).expect(201);

    const response = await server()
      .post(`/bills/${bill.id}/payment`)
      .send({ paymentDate: '2026-09-10' })
      .expect(409);

    expect(response.body.message).toBe(
      'Esta conta pertence a uma fatura; o pagamento deve ser registrado na fatura',
    );
  });

  describe('pagamento', () => {
    it('paga a fatura e todas as contas na mesma data', async () => {
      const a = await createBill({ documentNumber: 'NF-A' });
      const b = await createBill({ documentNumber: 'NF-B' });
      const invoice = await createInvoice([a.id, b.id]).expect(201);

      const paid = await server()
        .post(`/invoices/${invoice.body.id}/payment`)
        .send({ paymentDate: '2026-09-12' })
        .expect(200);

      expect(paid.body.status).toBe('PAID');

      const bills = await context.prisma.bill.findMany();
      expect(bills).toHaveLength(2);
      for (const bill of bills) {
        expect(bill.status).toBe('PAID');
        expect(bill.paymentDate?.toISOString()).toContain('2026-09-12');
      }
    });

    it('estorna a fatura e todas as contas', async () => {
      const bill = await createBill();
      const invoice = await createInvoice([bill.id]).expect(201);
      await server()
        .post(`/invoices/${invoice.body.id}/payment`)
        .send({ paymentDate: '2026-09-12' })
        .expect(200);

      await server().delete(`/invoices/${invoice.body.id}/payment`).expect(200);

      const stored = await context.prisma.bill.findUniqueOrThrow({
        where: { id: bill.id },
      });
      expect(stored.status).toBe('PENDING');
      expect(stored.paymentDate).toBeNull();
    });

    it('recusa pagar fatura já paga', async () => {
      const bill = await createBill();
      const invoice = await createInvoice([bill.id]).expect(201);
      await server()
        .post(`/invoices/${invoice.body.id}/payment`)
        .send({ paymentDate: '2026-09-12' });

      await server()
        .post(`/invoices/${invoice.body.id}/payment`)
        .send({ paymentDate: '2026-09-13' })
        .expect(409);
    });

    it('recusa editar e remover fatura paga', async () => {
      const bill = await createBill();
      const invoice = await createInvoice([bill.id]).expect(201);
      await server()
        .post(`/invoices/${invoice.body.id}/payment`)
        .send({ paymentDate: '2026-09-12' });

      await server()
        .patch(`/invoices/${invoice.body.id}`)
        .send({ number: 'FAT-EDITADA' })
        .expect(409);

      await server().delete(`/invoices/${invoice.body.id}`).expect(409);
    });
  });

  describe('edição do conjunto de contas', () => {
    it('desvincula as contas removidas da lista', async () => {
      const a = await createBill({ documentNumber: 'NF-A' });
      const b = await createBill({ documentNumber: 'NF-B' });
      const invoice = await createInvoice([a.id, b.id]).expect(201);

      const updated = await server()
        .patch(`/invoices/${invoice.body.id}`)
        .send({ billIds: [a.id] })
        .expect(200);

      expect(updated.body.billCount).toBe(1);

      const desvinculada = await context.prisma.bill.findUniqueOrThrow({
        where: { id: b.id },
      });
      expect(desvinculada.invoiceId).toBeNull();
    });
  });

  it('desvincula as contas ao remover a fatura', async () => {
    const bill = await createBill();
    const invoice = await createInvoice([bill.id]).expect(201);

    await server().delete(`/invoices/${invoice.body.id}`).expect(204);

    const stored = await context.prisma.bill.findUniqueOrThrow({
      where: { id: bill.id },
    });
    expect(stored.invoiceId).toBeNull();
    expect(await context.prisma.invoice.count()).toBe(0);
  });

  it('retorna 404 para fatura inexistente', async () => {
    await server().get('/invoices/inexistente').expect(404);
  });
});
