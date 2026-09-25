import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BillFieldsDto, MONEY_PATTERN, trimmed } from './create-bill.dto';

export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 60;

export class InstallmentDto {
  @Transform(trimmed)
  @IsString({ message: 'Rótulo do boleto deve ser um texto' })
  @IsNotEmpty({ message: 'Rótulo do boleto é obrigatório' })
  @MaxLength(20, { message: 'Rótulo do boleto deve ter até 20 caracteres' })
  label!: string;

  @IsDateString(
    {},
    { message: 'Vencimento do boleto deve estar no formato aaaa-mm-dd' },
  )
  dueDate!: string;

  @Matches(MONEY_PATTERN, {
    message:
      'Valor do boleto deve ser um número decimal com até 2 casas, ex: "333.34"',
  })
  amount!: string;

  @IsOptional()
  @IsString({ message: 'Linha digitável deve ser um texto' })
  digitableLine?: string | null;
}

export class CreateInstallmentsDto extends BillFieldsDto {
  @Matches(MONEY_PATTERN, {
    message:
      'Valor total deve ser um número decimal com até 2 casas, ex: "1000.00"',
  })
  totalAmount!: string;

  @IsArray({ message: 'Boletos devem ser uma lista' })
  @ArrayMinSize(MIN_INSTALLMENTS, {
    message: `Informe ao menos ${MIN_INSTALLMENTS} boletos`,
  })
  @ArrayMaxSize(MAX_INSTALLMENTS, {
    message: `Informe no máximo ${MAX_INSTALLMENTS} boletos`,
  })
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments!: InstallmentDto[];
}
