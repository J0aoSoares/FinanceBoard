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
  dateFromToday,
  installmentsPayload,
} from './helpers/fixtures';

const BANK_SLIP_LINE = '00190000090123456789701234567897715510000560000';
const BANK_SLIP_LINE_FORMATTED =
  '00190.00009 01234.567897 01234.567897 7 15510000560000';
const COLLECTION_LINE_MOD10 =
  '856700000123345000012020609150000006000000000018';
const COLLECTION_LINE_MOD11 =
  '858000000674890000022027610100000008000000000027';

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
    it('cadastra boleto com bruto e líquido iguais ao valor', async () => {
      const response = await server()
        .post('/bills')
        .send(billPayload(fixtures, { amount: '1500.00' }))
        .expect(201);

      expect(response.body.grossAmount).toBe('1500');
      expect(response.body.netAmount).toBe('1500');
      expect(response.body.hasTaxWithholding).toBe(false);
      expect(response.body.taxWithholdings).toEqual([]);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.description).toBe('Boleto 001');
      expect(response.body.documentNumber).toBe('Boleto 001');
      expect(response.body.group).toBeNull();
    });

    it('recusa retenções e valor bruto no cadastro de boleto', async () => {
      await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            withholdings: [{ type: 'INSS', amount: '100.00' }],
          }),
        )
        .expect(400);

      await server()
        .post('/bills')
        .send(billPayload(fixtures, { grossAmount: '1000.00' }))
        .expect(400);

      expect(await context.prisma.bill.count()).toBe(0);
    });

    it('cadastra conta sem obra (despesa administrativa)', async () => {
      const response = await server()
        .post('/bills')
        .send(billPayload(fixtures, { projectId: undefined }))
        .expect(201);

      expect(response.body.projectId).toBeNull();
    });

    it('recusa descrição vazia ou só com espaços', async () => {
      await server()
        .post('/bills')
        .send(billPayload(fixtures, { description: '   ' }))
        .expect(400);
    });

    it('recusa vencimento anterior à data da compra', async () => {
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
        'Data de vencimento não pode ser anterior à data da compra',
      );
    });

    it('recusa valor como number em vez de string', async () => {
      await server()
        .post('/bills')
        .send(billPayload(fixtures, { amount: 1000 }))
        .expect(400);
    });

    it('recusa valor zero, negativo ou com mais de duas casas', async () => {
      for (const amount of ['0.00', '-500.00', '100.123']) {
        await server()
          .post('/bills')
          .send(billPayload(fixtures, { amount }))
          .expect(400);
      }
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

  describe('linha digitável', () => {
    it('aceita boleto bancário colado com espaços e pontos e grava só dígitos', async () => {
      const response = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, { digitableLine: BANK_SLIP_LINE_FORMATTED }),
        )
        .expect(201);

      expect(response.body.digitableLine).toBe(BANK_SLIP_LINE);
    });

    it('aceita arrecadação em módulo 10 e em módulo 11', async () => {
      for (const digitableLine of [
        COLLECTION_LINE_MOD10,
        COLLECTION_LINE_MOD11,
      ]) {
        const response = await server()
          .post('/bills')
          .send(billPayload(fixtures, { digitableLine }))
          .expect(201);
        expect(response.body.digitableLine).toBe(digitableLine);
      }
    });

    it('recusa dígito verificador errado sem salvar', async () => {
      const wrongField =
        BANK_SLIP_LINE.slice(0, 20) +
        String((Number(BANK_SLIP_LINE[20]) + 1) % 10) +
        BANK_SLIP_LINE.slice(21);
      const field = await server()
        .post('/bills')
        .send(billPayload(fixtures, { digitableLine: wrongField }))
        .expect(400);
      expect(field.body.message).toBe(
        'Linha digitável inválida: dígito verificador do 2º campo não confere',
      );

      const wrongGeneral =
        BANK_SLIP_LINE.slice(0, 32) +
        String((Number(BANK_SLIP_LINE[32]) + 1) % 10) +
        BANK_SLIP_LINE.slice(33);
      const general = await server()
        .post('/bills')
        .send(billPayload(fixtures, { digitableLine: wrongGeneral }))
        .expect(400);
      expect(general.body.message).toBe(
        'Linha digitável inválida: dígito verificador geral não confere',
      );

      const wrongBlock =
        COLLECTION_LINE_MOD10.slice(0, 23) +
        String((Number(COLLECTION_LINE_MOD10[23]) + 1) % 10) +
        COLLECTION_LINE_MOD10.slice(24);
      const block = await server()
        .post('/bills')
        .send(billPayload(fixtures, { digitableLine: wrongBlock }))
        .expect(400);
      expect(block.body.message).toBe(
        'Linha digitável inválida: dígito verificador do 2º bloco não confere',
      );

      expect(await context.prisma.bill.count()).toBe(0);
    });

    it('recusa comprimento e caracteres inválidos', async () => {
      const short = await server()
        .post('/bills')
        .send(billPayload(fixtures, { digitableLine: '12345' }))
        .expect(400);
      expect(short.body.message).toBe(
        'Linha digitável deve ter 47 dígitos (boleto bancário) ou 48 (arrecadação); foram informados 5',
      );

      const letters = await server()
        .post('/bills')
        .send(billPayload(fixtures, { digitableLine: `${BANK_SLIP_LINE}-A` }))
        .expect(400);
      expect(letters.body.message).toBe(
        'Linha digitável deve conter apenas números, espaços e pontos',
      );
    });

    it('remove a linha digitável ao editar com null', async () => {
      const created = await server()
        .post('/bills')
        .send(billPayload(fixtures, { digitableLine: BANK_SLIP_LINE }))
        .expect(201);

      const updated = await server()
        .patch(`/bills/${created.body.id}`)
        .send({ digitableLine: null })
        .expect(200);

      expect(updated.body.digitableLine).toBeNull();
    });
  });

  describe('contas antigas com retenções', () => {
    it('preserva bruto, líquido e retenções ao editar a descrição', async () => {
      const legacy = await createLegacyBill(context.prisma, fixtures, {
        documentNumber: 'NF-ANTIGA',
        grossAmount: '1000.00',
        withholdings: [{ type: 'INSS', amount: '110.00' }],
      });

      const updated = await server()
        .patch(`/bills/${legacy.id}`)
        .send({ description: 'Serviço antigo' })
        .expect(200);

      expect(updated.body.description).toBe('Serviço antigo');
      expect(updated.body.grossAmount).toBe('1000');
      expect(updated.body.netAmount).toBe('890');
      expect(updated.body.taxWithholdings).toHaveLength(1);
    });

    it('recusa alterar o valor de conta com retenções antigas', async () => {
      const legacy = await createLegacyBill(context.prisma, fixtures, {
        documentNumber: 'NF-ANTIGA',
        grossAmount: '1000.00',
        withholdings: [{ type: 'INSS', amount: '110.00' }],
      });

      const response = await server()
        .patch(`/bills/${legacy.id}`)
        .send({ amount: '950.00' })
        .expect(409);

      expect(response.body.message).toBe(
        'Esta conta tem retenções do modelo anterior; o valor não pode ser alterado',
      );
    });

    it('aceita reenviar o próprio líquido de conta antiga sem mexer no bruto', async () => {
      const legacy = await createLegacyBill(context.prisma, fixtures, {
        documentNumber: 'NF-ANTIGA',
        grossAmount: '1000.00',
        withholdings: [{ type: 'ISS', amount: '50.00' }],
      });

      const updated = await server()
        .patch(`/bills/${legacy.id}`)
        .send({ amount: '950.00', description: 'Serviço antigo' })
        .expect(200);

      expect(updated.body.grossAmount).toBe('1000');
      expect(updated.body.netAmount).toBe('950');
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
        .send({ description: 'Editada' })
        .expect(409);

      expect(response.body.message).toBe(
        'Não é possível editar uma conta já paga; estorne o pagamento antes',
      );
    });
  });

  describe('edição', () => {
    it('editar o valor atualiza bruto e líquido juntos', async () => {
      const created = await server()
        .post('/bills')
        .send(billPayload(fixtures, { amount: '1000.00' }));

      const updated = await server()
        .patch(`/bills/${created.body.id}`)
        .send({ amount: '2000.00' })
        .expect(200);

      expect(updated.body.grossAmount).toBe('2000');
      expect(updated.body.netAmount).toBe('2000');
      expect(updated.body.taxWithholdings).toEqual([]);
    });

    it('editar a descrição de um boleto do grupo mantém o rótulo no documento', async () => {
      const created = await server()
        .post('/bills/installments')
        .send(installmentsPayload(fixtures))
        .expect(201);

      const updated = await server()
        .patch(`/bills/${created.body[1].id}`)
        .send({ description: 'Cimento' })
        .expect(200);

      expect(updated.body.description).toBe('Cimento');
      expect(updated.body.documentNumber).toBe('Cimento · B');
      expect(updated.body.installmentLabel).toBe('B');
    });
  });

  describe('remoção', () => {
    it('remove conta antiga e suas retenções em cascata', async () => {
      const legacy = await createLegacyBill(context.prisma, fixtures, {
        documentNumber: 'NF-ANTIGA',
        grossAmount: '1000.00',
        withholdings: [{ type: 'INSS', amount: '110.00' }],
      });

      await server().delete(`/bills/${legacy.id}`).expect(204);

      expect(await context.prisma.taxWithholding.count()).toBe(0);
      expect(await context.prisma.bill.count()).toBe(0);
    });
  });

  describe('parcelamento (/bills/installments)', () => {
    it('cria todos os boletos no mesmo grupo, com rótulo e posição', async () => {
      const response = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            installments: [
              {
                label: 'A',
                dueDate: '2026-07-10',
                amount: '333.34',
                digitableLine: BANK_SLIP_LINE_FORMATTED,
              },
              { label: 'B', dueDate: '2026-08-10', amount: '333.33' },
              { label: 'C', dueDate: '2026-09-10', amount: '333.33' },
            ],
          }),
        )
        .expect(201);

      expect(response.body).toHaveLength(3);
      const [first, second, third] = response.body;
      expect(
        new Set(
          response.body.map((bill: { group: { id: string } }) => bill.group.id),
        ).size,
      ).toBe(1);
      expect(first.installmentLabel).toBe('A');
      expect(first.digitableLine).toBe(BANK_SLIP_LINE);
      expect(first.documentNumber).toBe('Compra parcelada · A');
      expect(first.grossAmount).toBe('333.34');
      expect(first.netAmount).toBe('333.34');
      expect(third.dueDate).toContain('2026-09-10');
      expect(second.group).toEqual({
        id: first.group.id,
        position: 2,
        billCount: 3,
        paidCount: 0,
        totalAmount: '1000.00',
      });
      expect(await context.prisma.billGroup.count()).toBe(1);
    });

    it('recusa soma dos boletos diferente do total', async () => {
      const response = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            installments: [
              { label: 'A', dueDate: '2026-07-10', amount: '333.33' },
              { label: 'B', dueDate: '2026-08-10', amount: '333.33' },
              { label: 'C', dueDate: '2026-09-10', amount: '333.33' },
            ],
          }),
        )
        .expect(400);

      expect(response.body.message).toBe(
        'A soma dos boletos (999.99) é diferente do valor total (1000.00)',
      );
      expect(await context.prisma.bill.count()).toBe(0);
    });

    it('recusa menos de 2 e mais de 60 boletos', async () => {
      const one = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            installments: [
              { label: 'A', dueDate: '2026-07-10', amount: '1000.00' },
            ],
          }),
        )
        .expect(400);
      expect(one.body.message).toContain('Informe ao menos 2 boletos');

      const many = Array.from({ length: 61 }, (_, index) => ({
        label: String(index + 1),
        dueDate: '2026-07-10',
        amount: '1.00',
      }));
      const tooMany = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            totalAmount: '61.00',
            installments: many,
          }),
        )
        .expect(400);
      expect(tooMany.body.message).toContain('Informe no máximo 60 boletos');
    });

    it('recusa rótulos repetidos no grupo, sem diferenciar maiúsculas', async () => {
      const response = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            totalAmount: '1000.00',
            installments: [
              { label: 'A', dueDate: '2026-07-10', amount: '500.00' },
              { label: ' a ', dueDate: '2026-08-10', amount: '500.00' },
            ],
          }),
        )
        .expect(400);

      expect(response.body.message).toBe(
        'Rótulo de boleto repetido no grupo: a',
      );
    });

    it('recusa boleto com vencimento anterior à compra ou linha inválida', async () => {
      const due = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            installments: [
              { label: 'A', dueDate: '2026-06-01', amount: '500.00' },
              { label: 'B', dueDate: '2026-08-10', amount: '500.00' },
            ],
          }),
        )
        .expect(400);
      expect(due.body.message).toBe(
        'Boleto A: vencimento não pode ser anterior à data da compra',
      );

      const line = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            installments: [
              { label: 'A', dueDate: '2026-07-10', amount: '500.00' },
              {
                label: 'B',
                dueDate: '2026-08-10',
                amount: '500.00',
                digitableLine: '123',
              },
            ],
          }),
        )
        .expect(400);
      expect(line.body.message).toBe(
        'Boleto B: Linha digitável deve ter 47 dígitos (boleto bancário) ou 48 (arrecadação); foram informados 3',
      );
      expect(await context.prisma.bill.count()).toBe(0);
    });

    it('desfaz tudo se a gravação falhar no meio da transação', async () => {
      await server()
        .post('/bills/installments')
        .send(installmentsPayload(fixtures, { supplierId: 'inexistente' }))
        .expect(400);

      expect(await context.prisma.bill.count()).toBe(0);
      expect(await context.prisma.billGroup.count()).toBe(0);
    });

    it('paga cada boleto individualmente e atualiza o progresso do grupo', async () => {
      const created = await server()
        .post('/bills/installments')
        .send(installmentsPayload(fixtures))
        .expect(201);

      const paid = await server()
        .post(`/bills/${created.body[0].id}/payment`)
        .send({ paymentDate: '2026-07-09' })
        .expect(200);

      expect(paid.body.group.paidCount).toBe(1);
      const other = await server()
        .get(`/bills/${created.body[2].id}`)
        .expect(200);
      expect(other.body.status).toBe('PENDING');
      expect(other.body.group.paidCount).toBe(1);
    });

    it('exclui o grupo inteiro e recusa se houver boleto pago', async () => {
      const created = await server()
        .post('/bills/installments')
        .send(installmentsPayload(fixtures))
        .expect(201);
      const groupId = created.body[0].group.id;

      await server()
        .post(`/bills/${created.body[1].id}/payment`)
        .send({ paymentDate: '2026-08-09' });
      const refused = await server()
        .delete(`/bills/installments/${groupId}`)
        .expect(409);
      expect(refused.body.message).toBe(
        'Não é possível excluir o grupo: há boletos pagos. Estorne os pagamentos antes',
      );
      expect(await context.prisma.bill.count()).toBe(3);

      await server().delete(`/bills/${created.body[1].id}/payment`).expect(200);
      await server().delete(`/bills/installments/${groupId}`).expect(204);
      expect(await context.prisma.bill.count()).toBe(0);
      expect(await context.prisma.billGroup.count()).toBe(0);
    });

    it('retorna 404 para grupo inexistente', async () => {
      await server().delete('/bills/installments/inexistente').expect(404);
    });

    it('recalcula as posições ao excluir um boleto e remove o grupo vazio', async () => {
      const created = await server()
        .post('/bills/installments')
        .send(
          installmentsPayload(fixtures, {
            totalAmount: '1000.00',
            installments: [
              { label: 'A', dueDate: '2026-07-10', amount: '500.00' },
              { label: 'B', dueDate: '2026-08-10', amount: '500.00' },
            ],
          }),
        )
        .expect(201);

      await server().delete(`/bills/${created.body[0].id}`).expect(204);
      const remaining = await server()
        .get(`/bills/${created.body[1].id}`)
        .expect(200);
      expect(remaining.body.group).toMatchObject({
        position: 1,
        billCount: 1,
        totalAmount: '500.00',
      });

      await server().delete(`/bills/${created.body[1].id}`).expect(204);
      expect(await context.prisma.billGroup.count()).toBe(0);
    });
  });

  describe('filtros', () => {
    beforeEach(async () => {
      await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            description: 'JUNHO',
            issueDate: '2026-06-10',
            dueDate: '2026-07-10',
          }),
        );
      const julho = await server()
        .post('/bills')
        .send(
          billPayload(fixtures, {
            description: 'JULHO',
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

    const descriptions = (body: { description: string }[]) =>
      body.map((b) => b.description).sort();

    it('filtra por empresa', async () => {
      const response = await server()
        .get(`/bills?companyId=${fixtures.companyA}`)
        .expect(200);

      expect(descriptions(response.body)).toEqual(['JUNHO']);
    });

    it('filtra por obra', async () => {
      const response = await server()
        .get(`/bills?projectId=${fixtures.projectB}`)
        .expect(200);

      expect(descriptions(response.body)).toEqual(['JULHO']);
    });

    it('filtra por categoria', async () => {
      const response = await server()
        .get(`/bills?categoryId=${fixtures.categoryAlt}`)
        .expect(200);

      expect(descriptions(response.body)).toEqual(['JULHO']);
    });

    it('filtra por status pago', async () => {
      const response = await server().get('/bills?status=PAID').expect(200);

      expect(descriptions(response.body)).toEqual(['JULHO']);
    });

    it('filtra por mês em competência usando a emissão', async () => {
      const response = await server()
        .get('/bills?month=2026-06&regime=accrual')
        .expect(200);

      expect(descriptions(response.body)).toEqual(['JUNHO']);
    });

    it('filtra por mês em caixa usando o pagamento', async () => {
      const agosto = await server()
        .get('/bills?month=2026-08&regime=cash')
        .expect(200);
      expect(descriptions(agosto.body)).toEqual(['JULHO']);

      const junho = await server()
        .get('/bills?month=2026-06&regime=cash')
        .expect(200);
      expect(junho.body).toHaveLength(0);
    });

    it('dateBasis escolhe a data usada pelo filtro de mês', async () => {
      const due = await server()
        .get('/bills?month=2026-07&dateBasis=due')
        .expect(200);
      expect(descriptions(due.body)).toEqual(['JUNHO']);

      const issue = await server()
        .get('/bills?month=2026-07&dateBasis=issue')
        .expect(200);
      expect(descriptions(issue.body)).toEqual(['JULHO']);

      const payment = await server()
        .get('/bills?month=2026-08&dateBasis=payment')
        .expect(200);
      expect(descriptions(payment.body)).toEqual(['JULHO']);
    });

    it('dateBasis=due usa o vencimento da fatura para conta faturada', async () => {
      const junho = await server()
        .get(`/bills?companyId=${fixtures.companyA}`)
        .expect(200);
      await server()
        .post('/invoices')
        .send({
          number: 'FAT-01',
          companyId: fixtures.companyA,
          dueDate: '2026-09-20',
          billIds: [junho.body[0].id],
        })
        .expect(201);

      const july = await server()
        .get('/bills?month=2026-07&dateBasis=due')
        .expect(200);
      expect(july.body).toHaveLength(0);

      const september = await server()
        .get('/bills?month=2026-09&dateBasis=due')
        .expect(200);
      expect(descriptions(september.body)).toEqual(['JUNHO']);
    });

    it('lista os boletos do grupo que vencem no mês com a posição no grupo', async () => {
      await server()
        .post('/bills/installments')
        .send(installmentsPayload(fixtures))
        .expect(201);

      const response = await server()
        .get('/bills?month=2026-08&dateBasis=due')
        .expect(200);
      const grouped = response.body.filter(
        (bill: { group: unknown }) => bill.group !== null,
      );
      expect(grouped).toHaveLength(1);
      expect(grouped[0].installmentLabel).toBe('B');
      expect(grouped[0].group).toMatchObject({ position: 2, billCount: 3 });
    });

    it('recusa regime e dateBasis juntos, e dateBasis inválido', async () => {
      const both = await server()
        .get('/bills?month=2026-07&regime=cash&dateBasis=due')
        .expect(400);
      expect(both.body.message).toBe(
        'Informe regime ou dateBasis, não os dois ao mesmo tempo',
      );

      await server().get('/bills?dateBasis=vencimento').expect(400);
    });

    it('recusa mês em formato inválido', async () => {
      await server().get('/bills?month=06-2026').expect(400);
    });
  });
});
