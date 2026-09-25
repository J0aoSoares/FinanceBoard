import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export class BillFieldsDto {
  @Transform(trimmed)
  @IsString({ message: 'Descrição deve ser um texto' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description!: string;

  @IsDateString(
    {},
    { message: 'Data da compra deve estar no formato aaaa-mm-dd' },
  )
  issueDate!: string;

  @IsString({ message: 'Empresa deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Empresa é obrigatória' })
  companyId!: string;

  @IsOptional()
  @IsString({ message: 'Obra deve ser um identificador válido' })
  projectId?: string | null;

  @IsString({ message: 'Categoria deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  categoryId!: string;

  @IsString({ message: 'Fornecedor deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Fornecedor é obrigatório' })
  supplierId!: string;
}

export class CreateBillDto extends BillFieldsDto {
  @Matches(MONEY_PATTERN, {
    message: 'Valor deve ser um número decimal com até 2 casas, ex: "1234.56"',
  })
  amount!: string;

  @IsDateString(
    {},
    { message: 'Data de vencimento deve estar no formato aaaa-mm-dd' },
  )
  dueDate!: string;

  @IsOptional()
  @IsString({ message: 'Linha digitável deve ser um texto' })
  digitableLine?: string | null;
}
