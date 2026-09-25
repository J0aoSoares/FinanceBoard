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

describe('Notas de serviço (/receivables)', () => {
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

  const withholdings = [
    { type: 'INSS', amount: '550.00' },
    { type: 'ISS', amount: '250.00' },
  ];

  describe('cadastro', () => {
    it('cadastra uma nota sem retenção com líquido igual ao bruto', async () => {
      const response = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures))
        .expect(201);

      expect(response.body).toMatchObject({
        number: 'NFS-001',
        description: 'Medição 01',
        clientName: 'Cliente Alfa',
        status: 'PENDING',
        withholdings: [],
        withholdingTotal: '0.00',
      });
      expect(response.body.grossAmount).toBe('5000');
      expect(response.body.netAmount).toBe('5000');
      expect(response.body.amount).toBe('5000');
      expect(response.body.competence).toContain('2026-06-01');
    });

    it('calcula o líquido no backend subtraindo as retenções do bruto', async () => {
      const response = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { withholdings }))
        .expect(201);

      expect(response.body.grossAmount).toBe('5000');
      expect(response.body.netAmount).toBe('4200');
      expect(response.body.amount).toBe('4200');
      expect(response.body.withholdingTotal).toBe('800.00');
      expect(
        response.body.withholdings.map(
          (withholding: { type: string }) => withholding.type,
        ),
      ).toEqual(['INSS', 'ISS']);
    });

    it('recusa líquido ou valor enviado pelo cliente', async () => {
      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { netAmount: '4000.00' }))
        .expect(400);

      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { amount: '5000.00' }))
        .expect(400);
    });

    it('recusa soma de retenções maior ou igual ao bruto', async () => {
      const greater = await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            withholdings: [{ type: 'INSS', amount: '5000.01' }],
          }),
        )
        .expect(400);
      expect(greater.body.message).toBe(
        'A soma das retenções deve ser menor que o valor bruto',
      );

      await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            withholdings: [
              { type: 'INSS', amount: '4000.00' },
              { type: 'ISS', amount: '1000.00' },
            ],
          }),
        )
        .expect(400);

      expect(await context.prisma.receivable.count()).toBe(0);
    });

    it('recusa retenção repetida, fora do enum ou zerada', async () => {
      const repeated = await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            withholdings: [
              { type: 'ISS', amount: '100.00' },
              { type: 'ISS', amount: '50.00' },
            ],
          }),
        )
        .expect(400);
      expect(repeated.body.message).toBe(
        'Não é possível informar mais de uma retenção do mesmo tipo',
      );

      await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            withholdings: [{ type: 'ICMS', amount: '100.00' }],
          }),
        )
        .expect(400);

      await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            withholdings: [{ type: 'INSS', amount: '0.00' }],
          }),
        )
        .expect(400);
    });

    it('recusa nota sem obra', async () => {
      const response = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { projectId: undefined }))
        .expect(400);

      expect(response.body.message).toContain('Obra é obrigatória');
    });

    it('recusa número repetido na mesma empresa e aceita em outra', async () => {
      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures))
        .expect(201);

      const duplicated = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { number: ' NFS-001 ' }))
        .expect(409);
      expect(duplicated.body.message).toBe(
        'Já existe uma nota com esse número nesta empresa',
      );

      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { companyId: fixtures.companyB }))
        .expect(201);
    });

    it('recusa número, tomador ou descrição vazios', async () => {
      for (const field of ['number', 'clientName', 'description']) {
        await server()
          .post('/receivables')
          .send(receivablePayload(fixtures, { [field]: '   ' }))
          .expect(400);
      }
    });

    it('aceita tomador diferente do cliente da obra', async () => {
      const response = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { clientName: 'Consórcio Beta' }))
        .expect(201);

      expect(response.body.clientName).toBe('Consórcio Beta');
      expect(response.body.project.clientName).toBe('Cliente Alfa');
    });

    it('recusa empresa inexistente', async () => {
      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { companyId: 'inexistente' }))
        .expect(400);
    });

    it('recusa valor e competência mal formatados', async () => {
      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { grossAmount: 5000 }))
        .expect(400);

      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { grossAmount: '-100.00' }))
        .expect(400);

      await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { competence: '06/2026' }))
        .expect(400);
    });
  });

  it('marca como OVERDUE nota vencida', async () => {
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

  describe('recebimento', () => {
    it('registra e estorna recebimento, esperando o líquido', async () => {
      const created = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { withholdings }))
        .expect(201);

      const received = await server()
        .post(`/receivables/${created.body.id}/receipt`)
        .send({ receiptDate: '2026-07-02' })
        .expect(200);

      expect(received.body.status).toBe('PAID');
      expect(received.body.receiptDate).toContain('2026-07-02');
      expect(received.body.netAmount).toBe('4200');

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
  });

  describe('edição', () => {
    it('recalcula o líquido ao trocar as retenções ou só o bruto', async () => {
      const created = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { withholdings }))
        .expect(201);

      const swapped = await server()
        .patch(`/receivables/${created.body.id}`)
        .send({ withholdings: [{ type: 'IRRF', amount: '75.00' }] })
        .expect(200);
      expect(swapped.body.netAmount).toBe('4925');
      expect(swapped.body.withholdings).toHaveLength(1);

      const regrossed = await server()
        .patch(`/receivables/${created.body.id}`)
        .send({ grossAmount: '6000.00' })
        .expect(200);
      expect(regrossed.body.netAmount).toBe('5925');
      expect(regrossed.body.amount).toBe('5925');
    });

    it('recusa editar nota já recebida ou tirar a obra', async () => {
      const created = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures))
        .expect(201);

      const withoutProject = await server()
        .patch(`/receivables/${created.body.id}`)
        .send({ projectId: null })
        .expect(400);
      expect(withoutProject.body.message).toBe('Obra é obrigatória');

      await server()
        .post(`/receivables/${created.body.id}/receipt`)
        .send({ receiptDate: '2026-07-02' });
      const paid = await server()
        .patch(`/receivables/${created.body.id}`)
        .send({ description: 'Editada' })
        .expect(409);
      expect(paid.body.message).toBe(
        'Não é possível editar uma nota já recebida; estorne o recebimento antes',
      );
    });

    it('exige obra e número ao editar nota antiga sem esses dados', async () => {
      const legacy = await context.prisma.receivable.create({
        data: {
          description: 'Recebível antigo',
          clientName: 'Cliente Antigo',
          amount: '1000.00',
          grossAmount: '1000.00',
          netAmount: '1000.00',
          competence: new Date('2026-05-01'),
          issueDate: new Date('2026-05-10'),
          dueDate: new Date('2026-06-10'),
          companyId: fixtures.companyA,
        },
      });

      const listed = await server().get('/receivables').expect(200);
      expect(listed.body[0]).toMatchObject({ number: null, projectId: null });

      const missingProject = await server()
        .patch(`/receivables/${legacy.id}`)
        .send({ description: 'Recebível antigo revisado' })
        .expect(400);
      expect(missingProject.body.message).toBe('Obra é obrigatória');

      const missingNumber = await server()
        .patch(`/receivables/${legacy.id}`)
        .send({ projectId: fixtures.projectA })
        .expect(400);
      expect(missingNumber.body.message).toBe('Número da nota é obrigatório');

      const fixed = await server()
        .patch(`/receivables/${legacy.id}`)
        .send({ projectId: fixtures.projectA, number: 'NFS-ANT' })
        .expect(200);
      expect(fixed.body).toMatchObject({
        number: 'NFS-ANT',
        projectId: fixtures.projectA,
      });
    });

    it('remove a nota e suas retenções em cascata', async () => {
      const created = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { withholdings }))
        .expect(201);

      await server().delete(`/receivables/${created.body.id}`).expect(204);

      expect(await context.prisma.receivableWithholding.count()).toBe(0);
      expect(await context.prisma.receivable.count()).toBe(0);
    });
  });

  describe('filtros', () => {
    beforeEach(async () => {
      const created = await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            description: 'Medição Junho',
            competence: '2026-05',
            issueDate: '2026-06-05',
            dueDate: '2026-07-05',
          }),
        );
      await server()
        .post(`/receivables/${created.body.id}/receipt`)
        .send({ receiptDate: '2026-07-02' });
    });

    it('filtra por mês nos dois regimes', async () => {
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

    it('dateBasis escolhe competência, emissão ou recebimento', async () => {
      const cases: [string, string, number][] = [
        ['competence', '2026-05', 1],
        ['competence', '2026-06', 0],
        ['issue', '2026-06', 1],
        ['receipt', '2026-07', 1],
        ['receipt', '2026-06', 0],
      ];
      for (const [basis, month, expected] of cases) {
        const response = await server()
          .get(`/receivables?month=${month}&dateBasis=${basis}`)
          .expect(200);
        expect(response.body).toHaveLength(expected);
      }
    });

    it('recusa regime e dateBasis juntos', async () => {
      await server()
        .get('/receivables?month=2026-06&regime=cash&dateBasis=competence')
        .expect(400);
    });
  });

  describe('resumo por obra (/receivables/summary)', () => {
    it('soma faturado, retenções, recebido e saldo a receber', async () => {
      const first = await server()
        .post('/receivables')
        .send(receivablePayload(fixtures, { withholdings }))
        .expect(201);
      await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            number: 'NFS-002',
            grossAmount: '3000.00',
          }),
        )
        .expect(201);
      await server()
        .post('/receivables')
        .send(
          receivablePayload(fixtures, {
            number: 'NFS-003',
            projectId: fixtures.projectB,
          }),
        )
        .expect(201);
      await server()
        .post(`/receivables/${first.body.id}/receipt`)
        .send({ receiptDate: '2026-07-02' })
        .expect(200);

      const response = await server()
        .get(`/receivables/summary?projectId=${fixtures.projectA}`)
        .expect(200);

      expect(response.body).toEqual({
        projectId: fixtures.projectA,
        invoiceCount: 2,
        receivedCount: 1,
        grossInvoiced: '8000.00',
        withholdingTotal: '800.00',
        netInvoiced: '7200.00',
        received: '4200.00',
        outstanding: '3000.00',
      });
    });

    it('retorna zeros para obra sem notas e 404 para obra inexistente', async () => {
      const empty = await server()
        .get(`/receivables/summary?projectId=${fixtures.projectB}`)
        .expect(200);
      expect(empty.body).toMatchObject({
        invoiceCount: 0,
        grossInvoiced: '0.00',
        outstanding: '0.00',
      });

      await server()
        .get('/receivables/summary?projectId=inexistente')
        .expect(404);
      await server().get('/receivables/summary').expect(400);
    });
  });

  it('retorna 404 para nota inexistente', async () => {
    const response = await server().get('/receivables/inexistente').expect(404);
    expect(response.body.message).toBe('Nota de serviço não encontrada');
  });
});
