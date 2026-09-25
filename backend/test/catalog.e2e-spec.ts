import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/test-app';
import { billPayload, createBaseFixtures } from './helpers/fixtures';

describe('Cadastros auxiliares', () => {
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

  describe('Obras (/projects)', () => {
    it('cadastra obra com status ACTIVE por padrão', async () => {
      const response = await server()
        .post('/projects')
        .send({ name: 'Obra Alfa', clientName: 'Cliente Alfa' })
        .expect(201);

      expect(response.body.status).toBe('ACTIVE');
    });

    it('encerra uma obra', async () => {
      const created = await server()
        .post('/projects')
        .send({ name: 'Obra Alfa', clientName: 'Cliente Alfa' });

      const response = await server()
        .patch(`/projects/${created.body.id}`)
        .send({ status: 'CLOSED' })
        .expect(200);

      expect(response.body.status).toBe('CLOSED');
    });

    it('filtra por status', async () => {
      await server()
        .post('/projects')
        .send({ name: 'Ativa', clientName: 'Cliente' });
      await server()
        .post('/projects')
        .send({ name: 'Encerrada', clientName: 'Cliente', status: 'CLOSED' });

      const ativas = await server().get('/projects?status=ACTIVE').expect(200);
      expect(ativas.body.map((p: { name: string }) => p.name)).toEqual([
        'Ativa',
      ]);

      const encerradas = await server()
        .get('/projects?status=CLOSED')
        .expect(200);
      expect(encerradas.body.map((p: { name: string }) => p.name)).toEqual([
        'Encerrada',
      ]);
    });

    it('recusa status fora do enum', async () => {
      await server()
        .post('/projects')
        .send({ name: 'Obra', clientName: 'Cliente', status: 'PAUSADA' })
        .expect(400);
    });

    it('recusa remover obra com contas vinculadas', async () => {
      const fixtures = await createBaseFixtures(context.prisma);
      await server().post('/bills').send(billPayload(fixtures)).expect(201);

      await server().delete(`/projects/${fixtures.projectA}`).expect(409);
    });

    it('retorna 404 para obra inexistente', async () => {
      await server().get('/projects/inexistente').expect(404);
    });
  });

  describe('Categorias (/categories)', () => {
    it('cadastra e recusa nome duplicado', async () => {
      await server()
        .post('/categories')
        .send({ name: 'Combustível' })
        .expect(201);

      const response = await server()
        .post('/categories')
        .send({ name: 'Combustível' })
        .expect(409);

      expect(response.body.message).toBe(
        'Já existe uma categoria com esse nome',
      );
    });

    it('recusa nome vazio', async () => {
      await server().post('/categories').send({ name: '' }).expect(400);
    });

    it('recusa remover categoria em uso', async () => {
      const fixtures = await createBaseFixtures(context.prisma);
      await server().post('/bills').send(billPayload(fixtures)).expect(201);

      await server().delete(`/categories/${fixtures.category}`).expect(409);
    });
  });

  describe('Fornecedores (/suppliers)', () => {
    it('cadastra com CNPJ', async () => {
      const response = await server()
        .post('/suppliers')
        .send({ name: 'Fornecedor Teste', document: '33333333000153' })
        .expect(201);

      expect(response.body.document).toBe('33333333000153');
    });

    it('cadastra com CPF', async () => {
      await server()
        .post('/suppliers')
        .send({ name: 'Autônomo', document: '12345678901' })
        .expect(201);
    });

    it('cadastra sem documento', async () => {
      const response = await server()
        .post('/suppliers')
        .send({ name: 'Sem Documento' })
        .expect(201);

      expect(response.body.document).toBeNull();
    });

    it('recusa documento com quantidade inválida de dígitos', async () => {
      await server()
        .post('/suppliers')
        .send({ name: 'Teste', document: '123456' })
        .expect(400);
    });

    it('remove espaços nas pontas do nome', async () => {
      const response = await server()
        .post('/suppliers')
        .send({ name: '  Posto Ipiranga  ' })
        .expect(201);

      expect(response.body.name).toBe('Posto Ipiranga');
    });

    it('recusa nome só com espaços', async () => {
      await server().post('/suppliers').send({ name: '   ' }).expect(400);
    });

    it('recusa nome que só difere por maiúsculas, acentos ou espaços', async () => {
      await server()
        .post('/suppliers')
        .send({ name: 'Posto Ipiranga' })
        .expect(201);

      for (const name of [
        'posto ipiranga ',
        'POSTO  IPIRANGA',
        'Pôsto Ipirangá',
      ]) {
        const response = await server()
          .post('/suppliers')
          .send({ name })
          .expect(409);
        expect(response.body.message).toBe(
          'Já existe um fornecedor com esse nome',
        );
      }
    });

    it('recusa renomear para o nome de outro fornecedor', async () => {
      await server()
        .post('/suppliers')
        .send({ name: 'Auto Peças Diesel' })
        .expect(201);
      const other = await server()
        .post('/suppliers')
        .send({ name: 'Oficina Pesada' })
        .expect(201);

      await server()
        .patch(`/suppliers/${other.body.id}`)
        .send({ name: 'auto pecas diesel' })
        .expect(409);
    });

    it('permite renomear mudando só maiúsculas do próprio nome', async () => {
      const created = await server()
        .post('/suppliers')
        .send({ name: 'oficina pesada' })
        .expect(201);

      const response = await server()
        .patch(`/suppliers/${created.body.id}`)
        .send({ name: 'Oficina Pesada' })
        .expect(200);

      expect(response.body.name).toBe('Oficina Pesada');
    });

    it('recusa remover fornecedor com contas vinculadas', async () => {
      const fixtures = await createBaseFixtures(context.prisma);
      await server().post('/bills').send(billPayload(fixtures)).expect(201);

      await server().delete(`/suppliers/${fixtures.supplier}`).expect(409);
    });
  });
});
