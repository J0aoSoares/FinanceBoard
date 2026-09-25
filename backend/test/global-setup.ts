import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

export default function globalSetup() {
  const envPath = resolve(__dirname, '..', '.env.test');
  config({ path: envPath, override: true, quiet: true });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !/financeboard_test/.test(databaseUrl)) {
    throw new Error(
      'DATABASE_URL do .env.test deve apontar para o banco de testes (financeboard_test).',
    );
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
