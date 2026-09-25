import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateSupplierDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Nome do fornecedor deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do fornecedor é obrigatório' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Documento deve ser um texto' })
  @Matches(/^(\d{11}|\d{14})$/, {
    message:
      'Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ), sem pontuação',
  })
  document?: string;
}
