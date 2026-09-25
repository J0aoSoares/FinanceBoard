import { TaxType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class BillWithholdingDto {
  @IsEnum(TaxType, {
    message: 'Tipo de retenção deve ser INSS, ISS, IRRF ou PIS_COFINS_CSLL',
  })
  type!: TaxType;

  @Matches(/^\d+(\.\d{1,2})?$/, {
    message:
      'Valor da retenção deve ser um número decimal com até 2 casas, ex: "150.00"',
  })
  amount!: string;
}

export class CreateBillDto {
  @IsString({ message: 'Número do documento deve ser um texto' })
  @IsNotEmpty({ message: 'Número do documento é obrigatório' })
  documentNumber!: string;

  @Matches(/^\d+(\.\d{1,2})?$/, {
    message:
      'Valor bruto deve ser um número decimal com até 2 casas, ex: "1234.56"',
  })
  grossAmount!: string;

  @IsDateString(
    {},
    { message: 'Data de emissão deve estar no formato aaaa-mm-dd' },
  )
  issueDate!: string;

  @IsDateString(
    {},
    { message: 'Data de vencimento deve estar no formato aaaa-mm-dd' },
  )
  dueDate!: string;

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

  @IsOptional()
  @IsArray({ message: 'Retenções devem ser uma lista' })
  @ValidateNested({ each: true })
  @Type(() => BillWithholdingDto)
  withholdings?: BillWithholdingDto[];
}
