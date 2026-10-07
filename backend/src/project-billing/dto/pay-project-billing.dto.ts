import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class PayProjectBillingDto {
  @IsDateString(
    {},
    { message: 'Data de pagamento deve estar no formato aaaa-mm-dd' },
  )
  paymentDate!: string;

  @IsString({ message: 'Banco deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Banco é obrigatório para registrar o pagamento' })
  bankId!: string;
}
