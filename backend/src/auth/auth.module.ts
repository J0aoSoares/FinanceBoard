import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RefreshTokenPurgeService } from './refresh-token-purge.service';
import { TokenService } from './token.service';

const trackerFromIp = (req: Record<string, unknown>) =>
  typeof req.ip === 'string' ? req.ip : 'unknown-ip';

const trackerFromEmail = (req: Record<string, unknown>) => {
  const body = req.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email : '';
  return `email:${email.trim().toLowerCase() || 'unknown'}`;
};

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl =
          Number(
            configService.get<string>('LOGIN_RATE_LIMIT_TTL_SECONDS', '300'),
          ) * 1000;
        const limit = Number(
          configService.get<string>('LOGIN_RATE_LIMIT_MAX', '10'),
        );

        return {
          errorMessage:
            'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
          throttlers: [
            { name: 'login-ip', ttl, limit, getTracker: trackerFromIp },
            { name: 'login-email', ttl, limit, getTracker: trackerFromEmail },
          ],
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    RefreshTokenPurgeService,
  ],
  exports: [JwtModule, PasswordService, TokenService],
})
export class AuthModule {}
