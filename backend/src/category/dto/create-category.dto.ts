import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { trimmed } from '../../bill/dto/create-bill.dto';

export class CreateCategoryDto {
  @Transform(trimmed)
  @IsString({ message: 'Nome da categoria deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da categoria é obrigatório' })
  name!: string;
}
