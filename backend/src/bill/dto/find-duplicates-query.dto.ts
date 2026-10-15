import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FindDuplicatesQueryDto {
  @IsString({ message: 'Fornecedor deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Fornecedor é obrigatório' })
  supplierId!: string;

  @IsString({ message: 'Número da NF deve ser um texto' })
  @IsNotEmpty({ message: 'Número da NF é obrigatório' })
  documentNumber!: string;

  @IsOptional()
  @IsString({ message: 'Boleto deve ser um identificador válido' })
  excludeBillId?: string;
}
