import { ProjectStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { trimmed } from '../../bill/dto/create-bill.dto';

export class CreateProjectDto {
  @Transform(trimmed)
  @IsString({ message: 'Nome da obra deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da obra é obrigatório' })
  name!: string;

  @Transform(trimmed)
  @IsString({ message: 'Nome do cliente deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do cliente é obrigatório' })
  clientName!: string;

  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status deve ser ACTIVE ou CLOSED' })
  status?: ProjectStatus;
}
