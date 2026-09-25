import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString({ message: 'Número da fatura deve ser um texto' })
  @IsNotEmpty({ message: 'Número da fatura é obrigatório' })
  number!: string;

  @IsString({ message: 'Empresa deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Empresa é obrigatória' })
  companyId!: string;

  @IsOptional()
  @IsString({ message: 'Fornecedor deve ser um identificador válido' })
  supplierId?: string | null;

  @IsDateString(
    {},
    { message: 'Data de vencimento deve estar no formato aaaa-mm-dd' },
  )
  dueDate!: string;

  @IsArray({ message: 'Contas devem ser uma lista de identificadores' })
  @ArrayNotEmpty({ message: 'A fatura deve conter ao menos uma conta' })
  @IsString({
    each: true,
    message: 'Cada conta deve ser um identificador válido',
  })
  billIds!: string[];
}
