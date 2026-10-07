import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';
import { MONEY_PATTERN } from '../../bill/dto/create-bill.dto';

export class CreateRetainageReleaseDto {
  @IsString({ message: 'Obra deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Obra é obrigatória' })
  projectId!: string;

  @IsString({ message: 'Empresa deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Empresa é obrigatória' })
  companyId!: string;

  @Matches(MONEY_PATTERN, {
    message:
      'Valor da devolução deve ser um número decimal com até 2 casas, ex: "1500.00"',
  })
  amount!: string;

  @IsDateString(
    {},
    { message: 'Data da devolução deve estar no formato aaaa-mm-dd' },
  )
  returnDate!: string;

  @IsString({ message: 'Banco deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Banco é obrigatório' })
  bankId!: string;
}
