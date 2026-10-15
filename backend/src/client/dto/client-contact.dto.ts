import { ContactRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { optionalText, trimmed } from './text-transforms';

export class ClientContactDto {
  @IsOptional()
  @IsString({ message: 'Contato deve ser um identificador válido' })
  id?: string;

  @Transform(trimmed)
  @IsString({ message: 'Nome do contato deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do contato é obrigatório' })
  name!: string;

  @IsEnum(ContactRole, {
    message:
      'Função do contato deve ser ENGINEER, FINANCE, PURCHASING, ADMINISTRATIVE ou OTHER',
  })
  role!: ContactRole;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Telefone do contato deve ser um texto' })
  phone?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsEmail({}, { message: 'E-mail do contato deve ser válido' })
  email?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Contato principal deve ser verdadeiro ou falso' })
  isPrimary?: boolean;
}
