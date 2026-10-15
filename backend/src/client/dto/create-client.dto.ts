import { PersonType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BRAZILIAN_STATES } from '../../common/br-document.util';
import { ClientContactDto } from './client-contact.dto';
import { optionalText, trimmed } from './text-transforms';

export const upperText = ({ value }: { value: unknown }) => {
  const text = optionalText({ value });
  return typeof text === 'string' ? text.toUpperCase() : text;
};

export class CreateClientDto {
  @IsOptional()
  @IsEnum(PersonType, {
    message: 'Tipo de pessoa deve ser COMPANY ou INDIVIDUAL',
  })
  personType?: PersonType;

  @Transform(trimmed)
  @IsString({ message: 'Razão social / nome deve ser um texto' })
  @IsNotEmpty({ message: 'Razão social / nome do cliente é obrigatório' })
  name!: string;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Nome fantasia deve ser um texto' })
  tradeName?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Documento deve ser um texto' })
  document?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Inscrição municipal deve ser um texto' })
  municipalRegistration?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Telefone deve ser um texto' })
  phone?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsEmail({}, { message: 'E-mail do cliente deve ser válido' })
  email?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'CEP deve ser um texto' })
  zipCode?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Logradouro deve ser um texto' })
  street?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Número do endereço deve ser um texto' })
  @MaxLength(20, { message: 'Número do endereço deve ter até 20 caracteres' })
  streetNumber?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Complemento deve ser um texto' })
  complement?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Bairro deve ser um texto' })
  district?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Cidade deve ser um texto' })
  city?: string | null;

  @Transform(upperText)
  @IsOptional()
  @IsIn(BRAZILIAN_STATES, { message: 'UF deve ser uma sigla de estado válida' })
  state?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  notes?: string | null;

  @IsOptional()
  @IsArray({ message: 'Contatos devem ser uma lista' })
  @ValidateNested({ each: true })
  @Type(() => ClientContactDto)
  contacts?: ClientContactDto[];
}
