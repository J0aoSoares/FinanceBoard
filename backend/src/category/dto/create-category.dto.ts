import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'Nome da categoria deve ser um texto' })
  @IsNotEmpty({ message: 'Nome da categoria é obrigatório' })
  name!: string;
}
