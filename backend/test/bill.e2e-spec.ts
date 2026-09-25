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
  dateFromToday,
} from './helpers/fixtures';

describe('Contas a pagar (/bills)', () => {
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

  describe('cadastro', () => {
    it('cadastra conta sem retenção com líquido igual ao bruto', async () => {
      const response = await server()
        .post('/bills')
        .send(billPayload(fixtures, { grossAmount: '1500.00' }))
        .expect(201);

      expect(response.body.grossAmount).toBe('1500');
      expect(response.body.netAmount).toBe('1500');
      expect(response.body.hasTaxWithholding).toBe(false);
      expect(response.body.status).toBe('PENDING');
    });

    it('calcula o líquido subtraindo as retenções do bruto', async () => {
      const response = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            grossAmount: '10000.00',
            withholdings: [
              { type: 'INSS', amount: '1100.00' },
              { type: 'ISS', amount: '500.00' },
            ],
          }),
        )
        .expect(201);

      expect(response.body.netAmount).toBe('8400');
      expect(response.body.hasTaxWithholding).toBe(true);
      expect(response.body.taxWithholdings).toHaveLength(2);
    });

    it('cadastra conta sem obra (despesa administrativa)', async () => {
      const response = await server()
        .post('/bills')
        .send(billPayload(fixtures, { projectId: undefined }))
        .expect(201);

      expect(response.body.projectId).toBeNull();
    });

    it('recusa soma de retenções maior ou igual ao bruto', async () => {
      const maior = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            grossAmount: '1000.00',
            withholdings: [{ type: 'INSS', amount: '1500.00' }],
          }),
        )
        .expect(400);

      expect(maior.body.message).toBe(
        'A soma das retenções deve ser menor que o valor bruto',
      );

      await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            grossAmount: '1000.00',
            withholdings: [{ type: 'INSS', amount: '1000.00' }],
          }),
        )
        .expect(400);
    });

    it('recusa duas retenções do mesmo tipo', async () => {
      const response = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            withholdings: [
              { type: 'INSS', amount: '100.00' },
              { type: 'INSS', amount: '50.00' },
            ],
          }),
        )
        .expect(400);

      expect(response.body.message).toBe(
        'Não é possível informar mais de uma retenção do mesmo tipo',
      );
    });

    it('recusa tipo de retenção fora do enum', async () => {
      await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            withholdings: [{ type: 'ICMS', amount: '100.00' }],
          }),
        )
        .expect(400);
    });

    it('recusa vencimento anterior à emissão', async () => {
      const response = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            issueDate: '2026-07-01',
            dueDate: '2026-06-01',
          }),
        )
        .expect(400);

      expect(response.body.message).toBe(
        'Data de vencimento não pode ser anterior à data de emissão',
      );
    });

    it('recusa valor como number em vez de string', async () => {
      await server()
        .post('/bills')
        .send(billPayload(fixtures, { grossAmount: 1000 }))
        .expect(400);
    });

    it('recusa valor negativo ou com mais de duas casas', async () => {
      await server()
        .post('/bills')
        .send(billPayload(fixtures, { grossAmount: '-500.00' }))
        .expect(400);

      await server()
        .post('/bills')
        .send(billPayload(fixtures, { grossAmount: '100.123' }))
        .expect(400);
    });

    it('recusa relações inexistentes com mensagem específica', async () => {
      const empresa = await server()
        .post('/bills')
        .send(billPayload(fixtures, { companyId: 'inexistente' }))
        .expect(400);
      expect(empresa.body.message).toBe('Empresa informada não existe');

      const obra = await server()
        .post('/bills')
        .send(billPayload(fixtures, { projectId: 'inexistente' }))
        .expect(400);
      expect(obra.body.message).toBe('Obra informada não existe');

      const categoria = await server()
        .post('/bills')
        .send(billPayload(fixtures, { categoryId: 'inexistente' }))
        .expect(400);
      expect(categoria.body.message).toBe('Categoria informada não existe');

      const fornecedor = await server()
        .post('/bills')
        .send(billPayload(fixtures, { supplierId: 'inexistente' }))
        .expect(400);
      expect(fornecedor.body.message).toBe('Fornecedor informado não existe');
    });
  });

  describe('status calculado', () => {
    it('marca como OVERDUE conta vencida e não paga', async () => {
      const created = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            issueDate: dateFromToday(-60),
            dueDate: dateFromToday(-10),
          }),
        )
        .expect(201);

      expect(created.body.status).toBe('PENDING');
      expect(created.body.effectiveStatus).toBe('OVERDUE');
    });

    it('mantém PENDING conta a vencer', async () => {
      const created = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            issueDate: dateFromToday(-5),
            dueDate: dateFromToday(30),
          }),
        )
        .expect(201);

      expect(created.body.effectiveStatus).toBe('PENDING');
    });

    it('não persiste OVERDUE no banco', async () => {
      await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            issueDate: dateFromToday(-60),
            dueDate: dateFromToday(-10),
          }),
        )
        .expect(201);

      const stored = await context.prisma.bill.findFirst();
      expect(stored?.status).toBe('PENDING');
    });
  });

  describe('pagamento', () => {
    it('registra e estorna pagamento', async () => {
      const created = await server()
        .post('/bills')
        .send(billPayload(fixtures))
        .expect(201);

      const paid = await server()
        .post(`/bills/${created.body.id}/payment`)
        .send({ paymentDate: '2026-07-08' })
        .expect(200);

      expect(paid.body.status).toBe('PAID');
      expect(paid.body.effectiveStatus).toBe('PAID');
      expect(paid.body.paymentDate).toContain('2026-07-08');

      const reverted = await server()
        .delete(`/bills/${created.body.id}/payment`)
        .expect(200);

      expect(reverted.body.status).toBe('PENDING');
      expect(reverted.body.paymentDate).toBeNull();
    });

    it('recusa pagar conta já paga', async () => {
      const created = await server().post('/bills').send(billPayload(fixtures));
      await server()
        .post(`/bills/${created.body.id}/payment`)
        .send({ paymentDate: '2026-07-08' });

      const response = await server()
        .post(`/bills/${created.body.id}/payment`)
        .send({ paymentDate: '2026-07-09' })
        .expect(409);

      expect(response.body.message).toBe('Esta conta já está paga');
    });

    it('recusa estornar conta sem pagamento', async () => {
      const created = await server().post('/bills').send(billPayload(fixtures));

      const response = await server()
        .delete(`/bills/${created.body.id}/payment`)
        .expect(409);

      expect(response.body.message).toBe(
        'Esta conta não possui pagamento registrado',
      );
    });

    it('recusa editar conta já paga', async () => {
      const created = await server().post('/bills').send(billPayload(fixtures));
      await server()
        .post(`/bills/${created.body.id}/payment`)
        .send({ paymentDate: '2026-07-08' });

      const response = await server()
        .patch(`/bills/${created.body.id}`)
        .send({ documentNumber: 'NF-EDITADA' })
        .expect(409);

      expect(response.body.message).toBe(
        'Não é possível editar uma conta já paga; estorne o pagamento antes',
      );
    });
  });

  describe('edição', () => {
    it('recalcula o líquido ao trocar as retenções', async () => {
      const created = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            grossAmount: '1000.00',
            withholdings: [{ type: 'INSS', amount: '110.00' }],
          }),
        );

      expect(created.body.netAmount).toBe('890');

      const updated = await server()
        .patch(`/bills/${created.body.id}`)
        .send({ withholdings: [{ type: 'ISS', amount: '50.00' }] })
        .expect(200);

      expect(updated.body.netAmount).toBe('950');
      expect(updated.body.taxWithholdings).toHaveLength(1);
      expect(updated.body.taxWithholdings[0].type).toBe('ISS');
    });

    it('recalcula o líquido ao trocar apenas o bruto', async () => {
      const created = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            grossAmount: '1000.00',
            withholdings: [{ type: 'INSS', amount: '110.00' }],
          }),
        );

      const updated = await server()
        .patch(`/bills/${created.body.id}`)
        .send({ grossAmount: '2000.00' })
        .expect(200);

      expect(updated.body.netAmount).toBe('1890');
    });
  });

  describe('remoção', () => {
    it('remove a conta e suas retenções em cascata', async () => {
      const created = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            withholdings: [{ type: 'INSS', amount: '110.00' }],
          }),
        );

      await server().delete(`/bills/${created.body.id}`).expect(204);

      expect(await context.prisma.taxWithholding.count()).toBe(0);
      expect(await context.prisma.bill.count()).toBe(0);
    });
  });

  describe('filtros', () => {
    beforeEach(async () => {
      await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            documentNumber: 'NF-JUNHO',
            issueDate: '2026-06-10',
            dueDate: '2026-07-10',
          }),
        );
      const julho = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            documentNumber: 'NF-JULHO',
            issueDate: '2026-07-15',
            dueDate: '2026-08-15',
            companyId: fixtures.companyB,
            projectId: fixtures.projectB,
            categoryId: fixtures.categoryAlt,
          }),
        );
      await server()
        .post(`/bills/${julho.body.id}/payment`)
        .send({ paymentDate: '2026-08-12' });
    });

    const numbers = (body: { documentNumber: string }[]) =>
      body.map((b) => b.documentNumber).sort();

    it('filtra por empresa', async () => {
      const response = await server()
        .get(`/bills?companyId=${fixtures.companyA}`)
        .expect(200);

      expect(numbers(response.body)).toEqual(['NF-JUNHO']);
    });

    it('filtra por obra', async () => {
      const response = await server()
        .get(`/bills?projectId=${fixtures.projectB}`)
        .expect(200);

      expect(numbers(response.body)).toEqual(['NF-JULHO']);
    });

    it('filtra por categoria', async () => {
      const response = await server()
        .get(`/bills?categoryId=${fixtures.categoryAlt}`)
        .expect(200);

      expect(numbers(response.body)).toEqual(['NF-JULHO']);
    });

    it('filtra por status pago', async () => {
      const response = await server().get('/bills?status=PAID').expect(200);

      expect(numbers(response.body)).toEqual(['NF-JULHO']);
    });

    it('filtra por mês em competência usando a emissão', async () => {
      const response = await server()
        .get('/bills?month=2026-06&regime=accrual')
        .expect(200);

      expect(numbers(response.body)).toEqual(['NF-JUNHO']);
    });

    it('filtra por mês em caixa usando o pagamento', async () => {
      const agosto = await server()
        .get('/bills?month=2026-08&regime=cash')
        .expect(200);
      expect(numbers(agosto.body)).toEqual(['NF-JULHO']);

      const junho = await server()
        .get('/bills?month=2026-06&regime=cash')
        .expect(200);
      expect(junho.body).toHaveLength(0);
    });

    it('recusa mês em formato inválido', async () => {
      await server().get('/bills?month=06-2026').expect(400);
    });
  });
});
