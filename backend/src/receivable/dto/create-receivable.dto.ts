import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateReceivableDto {
  @IsString({ message: 'Descrição deve ser um texto' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description!: string;

  @IsString({ message: 'Nome do cliente deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do cliente é obrigatório' })
  clientName!: string;

  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Valor deve ser um número decimal com até 2 casas, ex: "1234.56"',
  })
  amount!: string;

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
}
