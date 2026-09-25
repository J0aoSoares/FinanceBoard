import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL é obrigatória' })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_SECRET é obrigatória e deve ter ao menos 32 caracteres',
  })
  JWT_SECRET!: string;

  @IsOptional()
  @Matches(/^\d+[smhd]$/, {
    message: 'JWT_ACCESS_EXPIRES_IN deve ser algo como 15m, 1h ou 7d',
  })
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsInt({
    message: 'REFRESH_TOKEN_EXPIRES_IN_DAYS deve ser um número inteiro',
  })
  @Min(1, { message: 'REFRESH_TOKEN_EXPIRES_IN_DAYS deve ser ao menos 1' })
  REFRESH_TOKEN_EXPIRES_IN_DAYS?: number;

  @IsString()
  @IsNotEmpty({
    message:
      'CORS_ORIGINS é obrigatória. Informe as origens separadas por vírgula, ex: http://localhost:5173',
  })
  CORS_ORIGINS!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  LOGIN_RATE_LIMIT_TTL_SECONDS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  LOGIN_RATE_LIMIT_MAX?: number;
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const DEFAULT_POSTGRES_PORT = '5432';

function composeCredentialsMismatch(
  config: Record<string, unknown>,
): string | null {
  const { DATABASE_URL, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT } =
    config;
  if (typeof DATABASE_URL !== 'string' || typeof POSTGRES_USER !== 'string') {
    return null;
  }

  let url: URL;
  try {
    url = new URL(DATABASE_URL);
  } catch {
    return null;
  }

  const composePort =
    typeof POSTGRES_PORT === 'string' || typeof POSTGRES_PORT === 'number'
      ? String(POSTGRES_PORT)
      : DEFAULT_POSTGRES_PORT;
  const urlPort = url.port || DEFAULT_POSTGRES_PORT;
  if (!LOCAL_HOSTS.includes(url.hostname) || urlPort !== composePort) {
    return null;
  }

  const mismatched: string[] = [];
  if (decodeURIComponent(url.username) !== POSTGRES_USER) {
    mismatched.push('o usuário difere de POSTGRES_USER');
  }
  if (
    typeof POSTGRES_PASSWORD === 'string' &&
    decodeURIComponent(url.password) !== POSTGRES_PASSWORD
  ) {
    mismatched.push('a senha difere de POSTGRES_PASSWORD');
  }

  return mismatched.length === 0
    ? null
    : `DATABASE_URL aponta para o Postgres do docker-compose (${url.hostname}:${urlPort}), mas ${mismatched.join(' e ')}. O banco foi criado com as credenciais POSTGRES_*: ajuste o DATABASE_URL para usá-las`;
}

export function validateEnv(config: Record<string, unknown>) {
  const mismatch = composeCredentialsMismatch(config);
  if (mismatch) {
    throw new Error(`Configuração de ambiente inválida: ${mismatch}`);
  }

  const parsed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(parsed, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Configuração de ambiente inválida: ${messages}`);
  }

  return config;
}
