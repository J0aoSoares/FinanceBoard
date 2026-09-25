import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser um texto' })
  @IsNotEmpty({ message: 'Nome não pode ser vazio' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail deve ser válido' })
  email?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Papel deve ser ADMIN, OPERATOR ou VIEWER' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'Situação deve ser verdadeiro ou falso' })
  isActive?: boolean;
}
