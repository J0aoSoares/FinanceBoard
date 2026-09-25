import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as request from 'supertest';
import { PasswordService } from '../../src/auth/password.service';
import { PrismaService } from '../../src/prisma/prisma.service';

export const TEST_PASSWORD = 'SenhaTeste123';

export const TEST_USERS: Record<UserRole, { name: string; email: string }> = {
  ADMIN: { name: 'Admin Teste', email: 'admin@financeboard.test' },
  OPERATOR: { name: 'Operador Teste', email: 'operador@financeboard.test' },
  VIEWER: { name: 'Contador Teste', email: 'contador@financeboard.test' },
};

export interface AuthClient {
  get: (url: string) => request.Test;
  post: (url: string) => request.Test;
  patch: (url: string) => request.Test;
  put: (url: string) => request.Test;
  delete: (url: string) => request.Test;
}

export async function ensureTestUsers(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const passwordService = app.get(PasswordService);
  const passwordHash = await passwordService.hash(TEST_PASSWORD);

  for (const role of Object.keys(TEST_USERS) as UserRole[]) {
    const { name, email } = TEST_USERS[role];
    await prisma.user.upsert({
      where: { email },
      update: { name, role, passwordHash, isActive: true },
      create: { name, email, role, passwordHash, isActive: true },
    });
  }
}

export async function login(
  app: INestApplication,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(
      `Login de teste falhou para ${email}: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return {
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

export function loginAs(app: INestApplication, role: UserRole) {
  return login(app, TEST_USERS[role].email);
}

export function authClient(app: INestApplication, token: string): AuthClient {
  const build =
    (method: 'get' | 'post' | 'patch' | 'put' | 'delete') => (url: string) =>
      request(app.getHttpServer())
        [method](url)
        .set('Authorization', `Bearer ${token}`);

  return {
    get: build('get'),
    post: build('post'),
    patch: build('patch'),
    put: build('put'),
    delete: build('delete'),
  };
}
