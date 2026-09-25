import { ProjectStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'Nome da obra deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da obra é obrigatório' })
  name!: string;

  @IsString({ message: 'Nome do cliente deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do cliente é obrigatório' })
  clientName!: string;

  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status deve ser ACTIVE ou CLOSED' })
  status?: ProjectStatus;
}
