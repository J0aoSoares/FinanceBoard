import { UserRole } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/test-app';
import { BaseFixtures, createBaseFixtures } from './helpers/fixtures';

const VALID_CNPJ = '11222333000181';
const OTHER_CNPJ = '11444777000161';
const VALID_CPF = '52998224725';

const engineer = {
  name: 'Paulo Engenheiro',
  role: 'ENGINEER',
  phone: '(11) 91234-5678',
};

describe('Clientes (/clients) e obra com cliente (/projects)', () => {
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

  const createClient = async (body: Record<string, unknown>) =>
    (await server().post('/clients').send(body).expect(201)).body;

  describe('cadastro de cliente', () => {
    it('grava documento, telefone e CEP só com dígitos e devolve os contatos', async () => {
      const client = await createClient({
        name: ' Construtora Vale Verde ',
        tradeName: 'Vale Verde',
        document: '11.222.333/0001-81',
        phone: '(11) 3456-7890',
        email: 'contato@valeverde.com.br',
        zipCode: '01310-100',
        state: 'sp',
        contacts: [{ ...engineer, isPrimary: true }],
      });

      expect(client).toMatchObject({
        name: 'Construtora Vale Verde',
        personType: 'COMPANY',
        document: VALID_CNPJ,
        phone: '1134567890',
        zipCode: '01310100',
        state: 'SP',
        projectCount: 0,
      });
      expect(client.contacts).toEqual([
        expect.objectContaining({
          name: 'Paulo Engenheiro',
          phone: '11912345678',
          isPrimary: true,
        }),
      ]);
    });

    it('recusa CNPJ e CPF com dígitos verificadores errados ou do tipo errado', async () => {
      const cases = [
        {
          body: { name: 'A', document: '11222333000182' },
          message: 'CNPJ inválido: dígitos verificadores não conferem',
        },
        {
          body: { name: 'A', document: '11111111111111' },
          message: 'CNPJ inválido: dígitos verificadores não conferem',
        },
        {
          body: {
            name: 'A',
            personType: 'INDIVIDUAL',
            document: '52998224726',
          },
          message: 'CPF inválido: dígitos verificadores não conferem',
        },
        {
          body: { name: 'A', document: VALID_CPF },
          message: 'CNPJ deve ter 14 dígitos',
        },
        {
          body: { name: 'A', personType: 'INDIVIDUAL', document: VALID_CNPJ },
          message: 'CPF deve ter 11 dígitos',
        },
      ];
      for (const item of cases) {
        const response = await server()
          .post('/clients')
          .send(item.body)
          .expect(400);
        expect(response.body.message).toBe(item.message);
      }

      const person = await createClient({
        name: 'Maria Souza',
        personType: 'INDIVIDUAL',
        document: '529.982.247-25',
      });
      expect(person.document).toBe(VALID_CPF);
      expect(await context.prisma.client.count()).toBe(3);
    });

    it('recusa documento duplicado mas aceita nomes iguais', async () => {
      await createClient({
        name: 'Prefeitura Municipal',
        document: VALID_CNPJ,
      });

      const duplicated = await server()
        .post('/clients')
        .send({ name: 'Outro nome', document: VALID_CNPJ })
        .expect(409);
      expect(duplicated.body.message).toBe(
        'Já existe um cliente com esse CPF/CNPJ',
      );

      await createClient({
        name: 'Prefeitura Municipal',
        document: OTHER_CNPJ,
      });
      await createClient({ name: 'Prefeitura Municipal' });
    });

    it('recusa telefone, e-mail e UF inválidos', async () => {
      const phone = await server()
        .post('/clients')
        .send({ name: 'A', phone: '1191234' })
        .expect(400);
      expect(phone.body.message).toBe('Telefone deve ter DDD e 8 ou 9 dígitos');

      const mobile = await server()
        .post('/clients')
        .send({ name: 'A', phone: '11812345678' })
        .expect(400);
      expect(mobile.body.message).toBe(
        'Celular deve começar com 9 depois do DDD',
      );

      const others = await server()
        .post('/clients')
        .send({ name: 'A', email: 'sem-arroba', state: 'XX' })
        .expect(400);
      expect(others.body.message).toEqual(
        expect.arrayContaining([
          'E-mail do cliente deve ser válido',
          'UF deve ser uma sigla de estado válida',
        ]),
      );
    });

    it('recusa contato sem telefone e sem e-mail', async () => {
      const response = await server()
        .post('/clients')
        .send({
          name: 'Cliente',
          contacts: [{ name: 'Ana', role: 'FINANCE', phone: '', email: ' ' }],
        })
        .expect(400);
      expect(response.body.message).toBe(
        'Contato "Ana": informe telefone ou e-mail',
      );
      expect(await context.prisma.client.count()).toBe(2);
    });

    it('recusa dois contatos principais na mesma função e aceita em funções diferentes', async () => {
      const response = await server()
        .post('/clients')
        .send({
          name: 'Cliente',
          contacts: [
            { ...engineer, isPrimary: true },
            {
              name: 'João',
              role: 'ENGINEER',
              email: 'joao@x.com',
              isPrimary: true,
            },
          ],
        })
        .expect(400);
      expect(response.body.message).toBe(
        'Só pode haver um contato principal por função: Engenheiro',
      );

      const client = await createClient({
        name: 'Cliente',
        contacts: [
          { ...engineer, isPrimary: true },
          { name: 'Ana', role: 'FINANCE', email: 'ana@x.com', isPrimary: true },
        ],
      });
      expect(client.contacts).toHaveLength(2);
    });

    it('sincroniza contatos ao editar e troca o principal sem conflito', async () => {
      const client = await createClient({
        name: 'Cliente',
        contacts: [
          { ...engineer, isPrimary: true },
          { name: 'João', role: 'ENGINEER', email: 'joao@x.com' },
          { name: 'Ana', role: 'FINANCE', email: 'ana@x.com' },
        ],
      });
      const byName = (name: string) =>
        client.contacts.find(
          (contact: { name: string }) => contact.name === name,
        );

      const updated = await server()
        .patch(`/clients/${client.id}`)
        .send({
          contacts: [
            { ...byName('Paulo Engenheiro'), isPrimary: false },
            { ...byName('João'), isPrimary: true },
            { name: 'Bia', role: 'PURCHASING', phone: '1134567890' },
          ].map((contact) => ({
            id: contact.id,
            name: contact.name,
            role: contact.role,
            phone: contact.phone ?? undefined,
            email: contact.email ?? undefined,
            isPrimary: contact.isPrimary ?? false,
          })),
        })
        .expect(200);

      expect(
        updated.body.contacts.map(
          (contact: { name: string; isPrimary: boolean }) =>
            `${contact.name}:${contact.isPrimary}`,
        ),
      ).toEqual(['João:true', 'Bia:false', 'Paulo Engenheiro:false']);
    });

    it('busca por nome, nome fantasia e documento parcial', async () => {
      await createClient({
        name: 'Construtora Vale Verde LTDA',
        tradeName: 'Vale Verde',
        document: VALID_CNPJ,
      });
      await createClient({ name: 'Mineradora Pedra Branca' });

      for (const search of ['vale', 'VERDE', '11.222', '0001-81']) {
        const response = await server()
          .get('/clients')
          .query({ search })
          .expect(200);
        expect(response.body.map((c: { name: string }) => c.name)).toEqual([
          'Construtora Vale Verde LTDA',
        ]);
      }
    });

    it('recusa excluir cliente com obras e exclui o que não tem', async () => {
      const blocked = await server()
        .delete(`/clients/${fixtures.clientA}`)
        .expect(409);
      expect(blocked.body.message).toBe(
        'Não é possível excluir este cliente: existem 1 obra vinculada a ele',
      );

      const free = await createClient({ name: 'Sem obras' });
      await server().delete(`/clients/${free.id}`).expect(204);
    });
  });

  describe('obra com cliente', () => {
    it('cria cliente, contatos e obra juntos e devolve o cliente resumido', async () => {
      const response = await server()
        .post('/projects')
        .send({
          name: 'Pavimentação Rua A',
          client: {
            name: 'Prefeitura de Itu',
            document: VALID_CNPJ,
            contacts: [
              { name: 'Ana', role: 'FINANCE', email: 'ana@itu.sp.gov.br' },
            ],
          },
          newReferenceContact: engineer,
        })
        .expect(201);

      expect(response.body.client).toMatchObject({
        name: 'Prefeitura de Itu',
        document: VALID_CNPJ,
      });
      expect(response.body.referenceContact).toMatchObject({
        name: 'Paulo Engenheiro',
        role: 'ENGINEER',
      });
      const client = await context.prisma.client.findUniqueOrThrow({
        where: { id: response.body.client.id },
        include: { contacts: true },
      });
      expect(client.contacts).toHaveLength(2);
    });

    it('não deixa cliente órfão quando a obra falha', async () => {
      const before = await context.prisma.client.count();
      const response = await server()
        .post('/projects')
        .send({
          name: 'obra alfa',
          client: { name: 'Cliente Novo', document: VALID_CNPJ },
        })
        .expect(409);
      expect(response.body.message).toBe('Já existe uma obra com esse nome');
      expect(await context.prisma.client.count()).toBe(before);
      expect(await context.prisma.clientContact.count()).toBe(0);
    });

    it('exige cliente e aceita só um jeito de informá-lo', async () => {
      const missing = await server()
        .post('/projects')
        .send({ name: 'Obra X' })
        .expect(400);
      expect(missing.body.message).toBe('Cliente da obra é obrigatório');

      await server()
        .post('/projects')
        .send({
          name: 'Obra X',
          clientId: fixtures.clientA,
          client: { name: 'Outro' },
        })
        .expect(400);

      const unknown = await server()
        .post('/projects')
        .send({ name: 'Obra X', clientId: 'inexistente' })
        .expect(400);
      expect(unknown.body.message).toBe('Cliente informado não existe');

      await server()
        .post('/projects')
        .send({ name: 'Obra X', clientName: 'Texto livre' })
        .expect(400);
    });

    it('recusa contato de referência de outro cliente', async () => {
      const other = await createClient({ name: 'Outro', contacts: [engineer] });
      const response = await server()
        .post('/projects')
        .send({
          name: 'Obra X',
          clientId: fixtures.clientA,
          referenceContactId: other.contacts[0].id,
        })
        .expect(400);
      expect(response.body.message).toBe(
        'O contato de referência precisa ser um contato do cliente da obra',
      );
    });

    it('limpa o contato de referência ao trocar o cliente da obra', async () => {
      const created = await server()
        .post('/projects')
        .send({
          name: 'Obra X',
          clientId: fixtures.clientA,
          newReferenceContact: engineer,
        })
        .expect(201);
      expect(created.body.referenceContactId).not.toBeNull();

      const renamed = await server()
        .patch(`/projects/${created.body.id}`)
        .send({ name: 'Obra X2' })
        .expect(200);
      expect(renamed.body.referenceContactId).toBe(
        created.body.referenceContactId,
      );

      const moved = await server()
        .patch(`/projects/${created.body.id}`)
        .send({ clientId: fixtures.clientB })
        .expect(200);
      expect(moved.body.client.name).toBe('Cliente Beta');
      expect(moved.body.referenceContactId).toBeNull();
      expect(moved.body.referenceContact).toBeNull();
    });

    it('edita os dados do cliente existente junto com a obra', async () => {
      const response = await server()
        .post('/projects')
        .send({
          name: 'Obra X',
          clientId: fixtures.clientA,
          clientChanges: { phone: '11912345678' },
        })
        .expect(201);
      expect(response.body.client.phone).toBe('11912345678');
    });

    it('excluir contato usado como referência limpa a referência da obra', async () => {
      const created = await server()
        .post('/projects')
        .send({
          name: 'Obra X',
          clientId: fixtures.clientA,
          newReferenceContact: engineer,
        })
        .expect(201);

      await server()
        .patch(`/clients/${fixtures.clientA}`)
        .send({ contacts: [] })
        .expect(200);

      const project = await server()
        .get(`/projects/${created.body.id}`)
        .expect(200);
      expect(project.body.referenceContactId).toBeNull();
    });
  });

  describe('migração das obras antigas', () => {
    const linkMigration = readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations/20261015120100_link_projects_to_clients/migration.sql',
      ),
      'utf8',
    )
      .split(/;\s*\r?\n\s*\r?\n/)
      .map((statement) => statement.trim().replace(/;$/, ''))
      .filter(Boolean);

    it('cria um cliente por nome normalizado e liga cada obra ao cliente certo', async () => {
      const legacy = [
        ['Obra 1', 'Prefeitura Municipal'],
        ['Obra 2', '  PREFEITURA   MUNICIPAL '],
        ['Obra 3', 'Prefeitúra Municipal'],
        ['Obra 4', 'Construtora Vale Verde'],
        ['Obra 5', 'construtora vale verde'],
        ['Obra 6', 'Mineradora'],
      ];
      for (const [index, [name, clientName]] of legacy.entries()) {
        await context.prisma.project.create({
          data: {
            name,
            nameKey: name.toLowerCase(),
            clientName,
            createdAt: new Date(Date.UTC(2026, 0, index + 1)),
          },
        });
      }

      for (const statement of linkMigration) {
        await context.prisma.$executeRawUnsafe(statement);
      }
      for (const statement of linkMigration) {
        await context.prisma.$executeRawUnsafe(statement);
      }

      const projects = await context.prisma.project.findMany({
        where: { clientName: { not: null } },
        include: { client: true },
        orderBy: { name: 'asc' },
      });
      expect(
        projects.map((project) => `${project.name}=${project.client?.name}`),
      ).toEqual([
        'Obra 1=Prefeitura Municipal',
        'Obra 2=Prefeitura Municipal',
        'Obra 3=Prefeitura Municipal',
        'Obra 4=Construtora Vale Verde',
        'Obra 5=Construtora Vale Verde',
        'Obra 6=Mineradora',
      ]);
      expect(new Set(projects.slice(0, 3).map((p) => p.clientId)).size).toBe(1);
      expect(await context.prisma.client.count()).toBe(5);
      expect(projects[0].clientName).toBe('Prefeitura Municipal');
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

    it('lê clientes mas não escreve', async () => {
      await viewer.client.get('/clients').expect(200);
      await viewer.client.get(`/clients/${fixtures.clientA}`).expect(200);
      await viewer.client.post('/clients').send({ name: 'X' }).expect(403);
      await viewer.client
        .patch(`/clients/${fixtures.clientA}`)
        .send({ name: 'X' })
        .expect(403);
      await viewer.client.delete(`/clients/${fixtures.clientB}`).expect(403);
    });
  });
});
