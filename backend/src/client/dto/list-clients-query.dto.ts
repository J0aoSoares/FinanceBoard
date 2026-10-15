import { IsOptional, IsString } from 'class-validator';

export class ListClientsQueryDto {
  @IsOptional()
  @IsString({ message: 'Busca deve ser um texto' })
  search?: string;
}
