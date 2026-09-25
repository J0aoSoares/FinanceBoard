import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenPayload } from './types/authenticated-user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_BYTES = 32;

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issuePair(user: User, familyId?: string): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(
      user.id,
      familyId ?? randomUUID(),
    );

    return { accessToken, refreshToken };
  }

  async rotate(presentedToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(presentedToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(
        'Refresh token já utilizado. Sessão encerrada por segurança; faça login novamente',
      );
    }

    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (!stored.user.isActive) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Usuário inativo');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issuePair(stored.user, stored.familyId);
  }

  async revokeFamilyByToken(presentedToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(presentedToken) },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.revokeFamily(stored.familyId);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async purgeExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.id };

    return this.jwtService.signAsync(payload, {
      algorithm: 'HS256',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  private async createRefreshToken(
    userId: string,
    familyId: string,
  ): Promise<string> {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const days = Number(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_DAYS', '30'),
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });

    return token;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
