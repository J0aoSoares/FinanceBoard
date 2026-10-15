import { ProjectStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { trimmed } from '../../bill/dto/create-bill.dto';
import { ClientContactDto } from '../../client/dto/client-contact.dto';
import { CreateClientDto } from '../../client/dto/create-client.dto';
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
}
