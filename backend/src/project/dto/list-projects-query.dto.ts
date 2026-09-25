import { ProjectStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListProjectsQueryDto {
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status deve ser ACTIVE ou CLOSED' })
  status?: ProjectStatus;
}
