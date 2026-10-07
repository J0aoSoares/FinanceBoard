import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { MONEY_PATTERN, trimmed } from '../../bill/dto/create-bill.dto';

export const PERCENT_PATTERN = /^\d{1,2}(\.\d{1,2})?$/;

export class CreateProjectBillingDto {
  @Transform(trimmed)
  @IsString({ message: 'Número da fatura deve ser um texto' })
  @IsNotEmpty({ message: 'Número da fatura é obrigatório' })
  number!: string;

  @IsString({ message: 'Empresa emissora deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Empresa emissora é obrigatória' })
  companyId!: string;

  @IsString({ message: 'Obra deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Obra é obrigatória' })
  projectId!: string;

  @Matches(MONEY_PATTERN, {
    message:
      'Valor da fatura deve ser um número decimal com até 2 casas, ex: "1234.56"',
  })
  amount!: string;

  @IsOptional()
  @Matches(MONEY_PATTERN, {
    message:
      'Valor da caução deve ser um número decimal com até 2 casas, ex: "250.00"',
  })
  retainageAmount?: string;

  @IsOptional()
  @Matches(PERCENT_PATTERN, {
    message:
      'Percentual da caução deve ser um número menor que 100 com até 2 casas, ex: "5" ou "2.5"',
  })
  retainagePercent?: string;

  @IsDateString(
    {},
    { message: 'Data de vencimento deve estar no formato aaaa-mm-dd' },
  )
  dueDate!: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data de pagamento deve estar no formato aaaa-mm-dd' },
  )
  paymentDate?: string;

  @IsOptional()
  @IsString({ message: 'Banco deve ser um identificador válido' })
  bankId?: string;
}
