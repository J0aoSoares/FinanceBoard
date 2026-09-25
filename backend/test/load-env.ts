import { config } from 'dotenv';
import { resolve } from 'path';

config({
  path: resolve(__dirname, '..', '.env.test'),
  override: true,
  quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não definida. Copie backend/.env.test.example para backend/.env.test antes de rodar os testes.',
  );
}

if (!/financeboard_test/.test(process.env.DATABASE_URL)) {
  throw new Error(
    'Os testes apagam todas as tabelas. DATABASE_URL do .env.test deve apontar para um banco cujo nome contenha "financeboard_test".',
  );
}
