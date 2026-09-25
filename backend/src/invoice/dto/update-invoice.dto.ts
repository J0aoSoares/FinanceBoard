import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString({ message: 'Número da fatura deve ser um texto' })
  number?: string;

  @IsOptional()
  @IsString({ message: 'Fornecedor deve ser um identificador válido' })
  supplierId?: string | null;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data de vencimento deve estar no formato aaaa-mm-dd' },
  )
  dueDate?: string;

  @IsOptional()
  @IsArray({ message: 'Contas devem ser uma lista de identificadores' })
  @ArrayNotEmpty({ message: 'A fatura deve conter ao menos uma conta' })
  @IsString({
    each: true,
    message: 'Cada conta deve ser um identificador válido',
  })
  billIds?: string[];
}
