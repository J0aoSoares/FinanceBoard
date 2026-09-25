import { UserRole } from '@prisma/client';
import {
  TEST_PASSWORD,
  TEST_USERS,
  authClient,
  login,
  loginAs,
} from './helpers/auth';
import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetRefreshTokens,
} from './helpers/test-app';

const NEW_USER = {
  name: 'Fulana de Tal',
  email: 'fulana@financeboard.test',
  password: 'SenhaNova123',
  role: UserRole.OPERATOR,
};

describe('Usuários (/users)', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp(UserRole.ADMIN);
  });

  beforeEach(async () => {
    await resetRefreshTokens(context.prisma);
    await context.prisma.user.deleteMany({
      where: {
        email: { notIn: Object.values(TEST_USERS).map((user) => user.email) },
      },
    });
    await context.prisma.user.update({
      where: { email: TEST_USERS.OPERATOR.email },
      data: { role: UserRole.OPERATOR, isActive: true },
    });
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  const asAdmin = () => context.client;

  const asRole = async (role: UserRole) => {
    const tokens = await loginAs(context.app, role);
    return authClient(context.app, tokens.accessToken);
  };

  describe('autorização', () => {
    it('recusa OPERATOR e VIEWER em todas as rotas de gestão', async () => {
      for (const role of [UserRole.OPERATOR, UserRole.VIEWER]) {
        const client = await asRole(role);
        await client.get('/users').expect(403);
        await client.post('/users').send(NEW_USER).expect(403);
        await client.patch('/users/qualquer').send({ name: 'X' }).expect(403);
        await client.delete('/users/qualquer').expect(403);
        await client
          .post('/users/qualquer/password')
          .send({ newPassword: 'OutraSenha123' })
          .expect(403);
      }
    });
  });

  describe('cadastro', () => {
    it('cria um usuário e nunca devolve o hash da senha', async () => {
      const response = await asAdmin()
        .post('/users')
        .send(NEW_USER)
        .expect(201);

      expect(response.body).toMatchObject({
        name: NEW_USER.name,
        email: NEW_USER.email,
        role: UserRole.OPERATOR,
        isActive: true,
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('normaliza o e-mail para minúsculas e permite o login com a senha definida', async () => {
      await asAdmin()
        .post('/users')
        .send({ ...NEW_USER, email: 'FULANA@Financeboard.Test' })
        .expect(201);

      const tokens = await login(
        context.app,
        NEW_USER.email,
        NEW_USER.password,
      );

      expect(tokens.accessToken).toEqual(expect.any(String));
    });

    it('recusa e-mail já cadastrado', async () => {
      await asAdmin().post('/users').send(NEW_USER).expect(201);

      const response = await asAdmin()
        .post('/users')
        .send({ ...NEW_USER, name: 'Outra Pessoa' })
        .expect(409);

      expect(response.body.message).toBe(
        'Já existe um usuário com esse e-mail',
      );
    });

    it('recusa senha fora da política', async () => {
      const response = await asAdmin()
        .post('/users')
        .send({ ...NEW_USER, password: 'curta1' })
        .expect(400);

      expect(response.body.message.join(' ')).toContain('ao menos 10');
    });

    it('recusa papel inválido', async () => {
      await asAdmin()
        .post('/users')
        .send({ ...NEW_USER, role: 'SUPERVISOR' })
        .expect(400);
    });
  });

  describe('listagem e leitura', () => {
    it('lista os usuários em ordem alfabética, sem hash de senha', async () => {
      const response = await asAdmin().get('/users').expect(200);

      const names = response.body.map((user: { name: string }) => user.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      for (const user of response.body) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('devolve 404 para id inexistente', async () => {
      await asAdmin().get('/users/nao-existe').expect(404);
    });
  });

  describe('edição', () => {
    it('altera nome, e-mail e papel', async () => {
      const created = await asAdmin().post('/users').send(NEW_USER).expect(201);

      const response = await asAdmin()
        .patch(`/users/${created.body.id}`)
        .send({ name: 'Fulana Editada', role: UserRole.VIEWER })
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Fulana Editada',
        role: UserRole.VIEWER,
      });
    });

    it('encerra as sessões abertas ao trocar o papel', async () => {
      const operator = await loginAs(context.app, UserRole.OPERATOR);
      const target = await context.prisma.user.findUniqueOrThrow({
        where: { email: TEST_USERS.OPERATOR.email },
      });

      await asAdmin()
        .patch(`/users/${target.id}`)
        .send({ role: UserRole.VIEWER })
        .expect(200);

      await context.client
        .post('/auth/refresh')
        .send({ refreshToken: operator.refreshToken })
        .expect(401);
    });

    it('impede o admin de alterar o próprio papel ou se desativar', async () => {
      const self = await context.client.get('/auth/me').expect(200);

      const roleChange = await asAdmin()
        .patch(`/users/${self.body.id}`)
        .send({ role: UserRole.VIEWER })
        .expect(400);
      expect(roleChange.body.message).toBe(
        'Você não pode alterar o próprio papel',
      );

      const deactivate = await asAdmin()
        .delete(`/users/${self.body.id}`)
        .expect(400);
      expect(deactivate.body.message).toBe(
        'Você não pode desativar o próprio usuário',
      );
    });
  });

  describe('desativação', () => {
    it('desativa sem apagar e bloqueia o login em seguida', async () => {
      const created = await asAdmin().post('/users').send(NEW_USER).expect(201);

      const response = await asAdmin()
        .delete(`/users/${created.body.id}`)
        .expect(200);
      expect(response.body.isActive).toBe(false);

      expect(
        await context.prisma.user.count({ where: { id: created.body.id } }),
      ).toBe(1);

      await expect(
        login(context.app, NEW_USER.email, NEW_USER.password),
      ).rejects.toThrow();
    });

    it('encerra as sessões abertas do usuário desativado', async () => {
      const created = await asAdmin().post('/users').send(NEW_USER).expect(201);
      const tokens = await login(
        context.app,
        NEW_USER.email,
        NEW_USER.password,
      );

      await asAdmin().delete(`/users/${created.body.id}`).expect(200);

      await context.client
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });
  });

  describe('reset de senha pelo admin', () => {
    it('define a nova senha, invalida a antiga e encerra as sessões', async () => {
      const created = await asAdmin().post('/users').send(NEW_USER).expect(201);
      const tokens = await login(
        context.app,
        NEW_USER.email,
        NEW_USER.password,
      );

      await asAdmin()
        .post(`/users/${created.body.id}/password`)
        .send({ newPassword: 'SenhaRedefinida123' })
        .expect(201);

      await context.client
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);

      await expect(
        login(context.app, NEW_USER.email, NEW_USER.password),
      ).rejects.toThrow();

      const renewed = await login(
        context.app,
        NEW_USER.email,
        'SenhaRedefinida123',
      );
      expect(renewed.accessToken).toEqual(expect.any(String));
    });

    it('recusa nova senha fora da política', async () => {
      const created = await asAdmin().post('/users').send(NEW_USER).expect(201);

      await asAdmin()
        .post(`/users/${created.body.id}/password`)
        .send({ newPassword: 'semnumero' })
        .expect(400);
    });
  });

  describe('troca da própria senha (/users/me/password)', () => {
    it('funciona para VIEWER, apesar de ser uma escrita', async () => {
      const created = await asAdmin()
        .post('/users')
        .send({ ...NEW_USER, role: UserRole.VIEWER })
        .expect(201);
      const tokens = await login(
        context.app,
        NEW_USER.email,
        NEW_USER.password,
      );
      const client = authClient(context.app, tokens.accessToken);

      await client
        .post('/users/me/password')
        .send({
          currentPassword: NEW_USER.password,
          newPassword: 'MinhaNovaSenha123',
        })
        .expect(204);

      expect(created.body.role).toBe(UserRole.VIEWER);

      const renewed = await login(
        context.app,
        NEW_USER.email,
        'MinhaNovaSenha123',
      );
      expect(renewed.accessToken).toEqual(expect.any(String));
    });

    it('recusa senha atual incorreta', async () => {
      const response = await context.client
        .post('/users/me/password')
        .send({
          currentPassword: 'SenhaQueNaoEhAMinha1',
          newPassword: 'OutraSenhaBoa123',
        })
        .expect(401);

      expect(response.body.message).toBe('Senha atual incorreta');
    });

    it('recusa nova senha igual à atual', async () => {
      const response = await context.client
        .post('/users/me/password')
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: TEST_PASSWORD,
        })
        .expect(400);

      expect(response.body.message).toBe(
        'A nova senha deve ser diferente da senha atual',
      );
    });
  });
});
