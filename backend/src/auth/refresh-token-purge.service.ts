import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

const DEFAULT_INTERVAL_HOURS = 12;
const HOUR_IN_MS = 60 * 60 * 1000;

@Injectable()
export class RefreshTokenPurgeService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RefreshTokenPurgeService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const hours = Number(
      this.configService.get<string>(
        'REFRESH_TOKEN_PURGE_INTERVAL_HOURS',
        String(DEFAULT_INTERVAL_HOURS),
      ),
    );

    if (!Number.isFinite(hours) || hours <= 0) {
      return;
    }

    void this.purge();
    this.timer = setInterval(() => void this.purge(), hours * HOUR_IN_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async purge(): Promise<number> {
    try {
      const removed = await this.tokenService.purgeExpired();
      if (removed > 0) {
        this.logger.log(`Refresh tokens expirados removidos: ${removed}`);
      }
      return removed;
    } catch (error) {
      this.logger.error(
        `Falha ao expurgar refresh tokens: ${(error as Error).message}`,
      );
      return 0;
    }
  }
}
