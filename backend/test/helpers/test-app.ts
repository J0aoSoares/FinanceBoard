import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/common/app-setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthClient, authClient, ensureTestUsers, loginAs } from './auth';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  client: AuthClient;
  accessToken: string;
  refreshToken: string;
}

export async function createTestApp(
  role: UserRole = UserRole.OPERATOR,
): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  await ensureTestUsers(app);
  const tokens = await loginAs(app, role);

  return {
    app,
    prisma: app.get(PrismaService),
    client: authClient(app, tokens.accessToken),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE tax_withholdings, bills, invoices, receivables, projects, categories, suppliers, companies RESTART IDENTITY CASCADE',
  );
}

export async function resetRefreshTokens(prisma: PrismaService) {
  await prisma.refreshToken.deleteMany();
}

export async function closeTestApp(context: TestContext) {
  await context.app.close();
}
