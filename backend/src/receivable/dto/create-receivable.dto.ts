import { TaxType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
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
import { MONEY_PATTERN, trimmed } from '../../bill/dto/create-bill.dto';

export class ReceivableWithholdingDto {
  @IsEnum(TaxType, {
    message: 'Tipo de retenção deve ser INSS, ISS, IRRF ou PIS_COFINS_CSLL',
  })
  type!: TaxType;

  @Matches(MONEY_PATTERN, {
    message:
      'Valor da retenção deve ser um número decimal com até 2 casas, ex: "150.00"',
  })
  amount!: string;
}

export class CreateReceivableDto {
  @Transform(trimmed)
  @IsString({ message: 'Número da nota deve ser um texto' })
  @IsNotEmpty({ message: 'Número da nota é obrigatório' })
  number!: string;

  @Transform(trimmed)
  @IsString({ message: 'Descrição do serviço deve ser um texto' })
  @IsNotEmpty({ message: 'Descrição do serviço é obrigatória' })
  description!: string;

  @Transform(trimmed)
  @IsString({ message: 'Tomador deve ser um texto' })
  @IsNotEmpty({ message: 'Tomador é obrigatório' })
  clientName!: string;

  @Matches(MONEY_PATTERN, {
    message:
      'Valor bruto deve ser um número decimal com até 2 casas, ex: "1234.56"',
  })
  grossAmount!: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Competência deve estar no formato aaaa-mm',
  })
  competence!: string;

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

  @IsString({ message: 'Obra deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Obra é obrigatória' })
  projectId!: string;

  @IsOptional()
  @IsArray({ message: 'Retenções devem ser uma lista' })
  @ValidateNested({ each: true })
  @Type(() => ReceivableWithholdingDto)
  withholdings?: ReceivableWithholdingDto[];
}
