import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser, userPublicSelect } from '../user/user.select';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';
import { TokenPair, TokenService } from './token.service';

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

export interface LoginResult extends TokenPair {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await this.passwordService.burnTime();
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordMatches = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const tokens = await this.tokenService.issuePair(user);

    return { ...tokens, user: this.toPublicUser(user) };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.rotate(refreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeFamilyByToken(refreshToken);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return user;
  }

  private toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    role: PublicUser['role'];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
