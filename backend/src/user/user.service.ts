import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser, userPublicSelect } from './user.select';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email.trim().toLowerCase(),
          passwordHash: await this.passwordService.hash(dto.password),
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
        select: userPublicSelect,
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: userPublicSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actingUserId: string,
  ): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (id === actingUserId && dto.isActive === false) {
      throw new BadRequestException(
        'Você não pode desativar o próprio usuário',
      );
    }

    if (id === actingUserId && dto.role && dto.role !== existing.role) {
      throw new BadRequestException('Você não pode alterar o próprio papel');
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email?.trim().toLowerCase(),
          role: dto.role,
          isActive: dto.isActive,
        },
        select: userPublicSelect,
      });

      if (dto.isActive === false || (dto.role && dto.role !== existing.role)) {
        await this.tokenService.revokeAllForUser(id);
      }

      return user;
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async deactivate(id: string, actingUserId: string): Promise<PublicUser> {
    return this.update(id, { isActive: false }, actingUserId);
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await this.passwordService.hash(dto.newPassword) },
      select: userPublicSelect,
    });

    await this.tokenService.revokeAllForUser(id);

    return user;
  }

  async changeOwnPassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const matches = await this.passwordService.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!matches) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwordService.hash(dto.newPassword) },
    });

    await this.tokenService.revokeAllForUser(userId);
  }

  private translateWriteError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Já existe um usuário com esse e-mail');
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return new NotFoundException('Usuário não encontrado');
    }
    return error;
  }
}
