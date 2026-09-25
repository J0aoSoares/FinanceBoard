import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import {
  PASSWORD_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../../auth/password-policy';

export class CreateUserDto {
  @IsString({ message: 'Nome deve ser um texto' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name!: string;

  @IsEmail({}, { message: 'E-mail deve ser válido' })
  email!: string;

  @IsString({ message: 'Senha deve ser um texto' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;

  @IsEnum(UserRole, { message: 'Papel deve ser ADMIN, OPERATOR ou VIEWER' })
  role!: UserRole;

  @IsOptional()
  isActive?: boolean;
}
