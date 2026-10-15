import { ProjectStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { trimmed } from '../../bill/dto/create-bill.dto';
import { BRAZILIAN_STATES } from '../../common/br-document.util';
import { ClientContactDto } from '../../client/dto/client-contact.dto';
import { CreateClientDto, upperText } from '../../client/dto/create-client.dto';
import { optionalText } from '../../client/dto/text-transforms';
import { UpdateClientDto } from '../../client/dto/update-client.dto';

export class CreateProjectDto {
  @Transform(trimmed)
  @IsString({ message: 'Nome da obra deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da obra é obrigatório' })
  name!: string;

  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status deve ser ACTIVE ou CLOSED' })
  status?: ProjectStatus;

  @IsOptional()
  @IsString({ message: 'Cliente deve ser um identificador válido' })
  clientId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClientDto)
  client?: CreateClientDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClientDto)
  clientChanges?: UpdateClientDto;

  @IsOptional()
  @IsString({
    message: 'Contato de referência deve ser um identificador válido',
  })
  referenceContactId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientContactDto)
  newReferenceContact?: ClientContactDto;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Número do contrato deve ser um texto' })
  contractNumber?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data de início deve estar no formato aaaa-mm-dd' },
  )
  startDate?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Previsão de término deve estar no formato aaaa-mm-dd' },
  )
  expectedEndDate?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'CEP da obra deve ser um texto' })
  zipCode?: string | null;

  @Transform(optionalText)
  @IsOptional()
  @IsString({ message: 'Logradouro da obra deve ser um texto' })
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
  @IsString({ message: 'Detalhes da obra devem ser um texto' })
  @MaxLength(5000, {
    message: 'Detalhes da obra devem ter até 5000 caracteres',
  })
  details?: string | null;
}
