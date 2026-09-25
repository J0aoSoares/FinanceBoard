import { IsDateString } from 'class-validator';

export class PayBillDto {
  @IsDateString(
    {},
    { message: 'Data de pagamento deve estar no formato aaaa-mm-dd' },
  )
  paymentDate!: string;
}
