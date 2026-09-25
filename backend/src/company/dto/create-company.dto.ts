import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsString({ message: 'Razão social deve ser um texto' })
  @IsNotEmpty({ message: 'Razão social é obrigatória' })
  legalName!: string;

  @IsString({ message: 'CNPJ deve ser um texto' })
  @Matches(/^\d{14}$/, {
    message: 'CNPJ deve conter exatamente 14 dígitos numéricos, sem pontuação',
  })
  cnpj!: string;
}
