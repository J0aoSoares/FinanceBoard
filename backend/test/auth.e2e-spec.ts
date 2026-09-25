import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as request from 'supertest';
import {
  TEST_PASSWORD,
  TEST_USERS,
  authClient,
  loginAs,
  login,
} from './helpers/auth';
import {
  TestContext,
  closeTestApp,
  createTestApp,
  resetDatabase,
  resetRefreshTokens,
} from './helpers/test-app';

describe('Autenticação e autorização (/auth)', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp(UserRole.ADMIN);
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    await resetRefreshTokens(context.prisma);
    await context.prisma.user.deleteMany({
      where: {
        email: {
          notIn: Object.values(TEST_USERS).map((user) => user.email),
        },
      },
    });
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  const anonymous = () => request(context.app.getHttpServer());

  describe('login', () => {
    it('autentica com credenciais válidas e não devolve o hash da senha', async () => {
      const response = await anonymous()
        .post('/auth/login')
        .send({ email: TEST_USERS.ADMIN.email, password: TEST_PASSWORD })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
      expect(response.body.user.email).toBe(TEST_USERS.ADMIN.email);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('devolve a mesma resposta para e-mail inexistente e senha errada', async () => {
      const unknownEmail = await anonymous()
        .post('/auth/login')
        .send({ email: 'ninguem@financeboard.test', password: TEST_PASSWORD })
        .expect(401);

      const wrongPassword = await anonymous()
        .post('/auth/login')
        .send({ email: TEST_USERS.ADMIN.email, password: 'SenhaErrada123' })
        .expect(401);

      expect(unknownEmail.body.message).toBe('E-mail ou senha inválidos');
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it('não autentica usuário inativo, com a mesma mensagem genérica', async () => {
      const email = 'inativo@financeboard.test';
      await context.client
        .post('/users')
        .send({
          name: 'Usuário Inativo',
          email,
          password: TEST_PASSWORD,
          role: UserRole.VIEWER,
          isActive: false,
        })
        .expect(201);

      const response = await anonymous()
        .post('/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(401);

      expect(response.body.message).toBe('E-mail ou senha inválidos');
    });
  });

  describe('guard global', () => {
    it('bloqueia rota de negócio sem token', async () => {
      await anonymous().get('/bills').expect(401);
      await anonymous().get('/companies').expect(401);
      await anonymous()
        .get('/reports/cashflow?from=2026-01&to=2026-03')
        .expect(401);
    });

    it('bloqueia token expirado', async () => {
      const jwtService = context.app.get(JwtService);
      const user = await context.prisma.user.findUniqueOrThrow({
        where: { email: TEST_USERS.ADMIN.email },
      });

      const expiredToken = await jwtService.signAsync(
        { sub: user.id },
        { algorithm: 'HS256', expiresIn: '-1s' },
      );

      const response = await anonymous()
        .get('/bills')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toBe('Token inválido ou expirado');
    });

    it('bloqueia token assinado com outro segredo', async () => {
      const foreign = new JwtService({
        secret: 'outro-segredo-completamente-diferente',
      });
      const token = await foreign.signAsync(
        { sub: 'qualquer' },
        { algorithm: 'HS256' },
      );

      await anonymous()
        .get('/bills')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('libera /auth/me com token válido e sem hash de senha', async () => {
      const response = await context.client.get('/auth/me').expect(200);

      expect(response.body.email).toBe(TEST_USERS.ADMIN.email);
      expect(response.body.role).toBe(UserRole.ADMIN);
      expect(response.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('autorização por papel', () => {
    it('VIEWER lê mas não escreve', async () => {
      const tokens = await loginAs(context.app, UserRole.VIEWER);
      const viewer = authClient(context.app, tokens.accessToken);

      await viewer.get('/companies').expect(200);

      const blocked = await viewer
        .post('/companies')
        .send({ legalName: 'Empresa Nova LTDA', cnpj: '44444444000199' })
        .expect(403);

      expect(blocked.body.message).toBe(
        'Perfil somente leitura: não é possível criar, alterar ou remover registros',
      );
    });

    it('OPERATOR escreve em lançamentos mas não acessa /users', async () => {
      const tokens = await loginAs(context.app, UserRole.OPERATOR);
      const operator = authClient(context.app, tokens.accessToken);

      await operator
        .post('/companies')
        .send({ legalName: 'Empresa do Operador LTDA', cnpj: '55555555000188' })
        .expect(201);

      await operator.get('/users').expect(403);
      await operator
        .post('/users')
        .send({
          name: 'Tentativa',
          email: 'tentativa@financeboard.test',
          password: TEST_PASSWORD,
          role: UserRole.VIEWER,
        })
        .expect(403);
    });

    it('ADMIN acessa /users', async () => {
      const response = await context.client.get('/users').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).not.toHaveProperty('passwordHash');
    });

    it('permite que qualquer papel troque a própria senha', async () => {
      const email = 'trocasenha@financeboard.test';
      await context.client
        .post('/users')
        .send({
          name: 'Troca Senha',
          email,
          password: TEST_PASSWORD,
          role: UserRole.VIEWER,
        })
        .expect(201);

      const tokens = await login(context.app, email);
      const viewer = authClient(context.app, tokens.accessToken);

      await viewer
        .post('/users/me/password')
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'NovaSenha456' })
        .expect(204);

      await login(context.app, email, 'NovaSenha456');
    });

    it('rejeita troca de senha com a senha atual errada', async () => {
      const response = await context.client
        .post('/users/me/password')
        .send({
          currentPassword: 'ErradaTotal123',
          newPassword: 'NovaSenha456',
        })
        .expect(401);

      expect(response.body.message).toBe('Senha atual incorreta');
    });
  });

  describe('rotação de refresh token', () => {
    it('rotaciona e invalida o token anterior', async () => {
      const first = await loginAs(context.app, UserRole.VIEWER);

      const rotated = await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);

      expect(rotated.body.refreshToken).not.toBe(first.refreshToken);
      expect(rotated.body.accessToken).toEqual(expect.any(String));

      const secondRotation = await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(200);

      expect(secondRotation.body.refreshToken).not.toBe(
        rotated.body.refreshToken,
      );
    });

    it('reusar um token já rotacionado revoga a sessão inteira', async () => {
      const first = await loginAs(context.app, UserRole.VIEWER);

      const rotated = await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);

      const reuse = await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(401);

      expect(reuse.body.message).toContain('Sessão encerrada por segurança');

      await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(401);
    });

    it('logout revoga a família inteira', async () => {
      const session = await loginAs(context.app, UserRole.VIEWER);
      const client = authClient(context.app, session.accessToken);

      const rotated = await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      await client
        .post('/auth/logout')
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(204);

      await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(401);
    });

    it('rejeita refresh token desconhecido', async () => {
      await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: 'token-que-nunca-existiu' })
        .expect(401);
    });
  });

  describe('expurgo de refresh tokens', () => {
    it('remove apenas os expirados e preserva os revogados ainda válidos', async () => {
      const session = await loginAs(context.app, UserRole.VIEWER);

      await anonymous()
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      const user = await context.prisma.user.findUniqueOrThrow({
        where: { email: TEST_USERS.VIEWER.email },
      });

      await context.prisma.refreshToken.create({
        data: {
          userId: user.id,
          familyId: 'familia-antiga',
          tokenHash: 'hash-expirado-de-teste',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const purge = context.app.get(
        (await import('../src/auth/refresh-token-purge.service'))
          .RefreshTokenPurgeService,
      );
      const removed = await purge.purge();

      expect(removed).toBe(1);

      const remaining = await context.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(remaining.some((token) => token.revokedAt !== null)).toBe(true);
    });
  });
});
