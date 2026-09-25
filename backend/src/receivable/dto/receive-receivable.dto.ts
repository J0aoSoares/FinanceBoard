import { IsDateString } from 'class-validator';

export class ReceiveReceivableDto {
  @IsDateString(
    {},
    { message: 'Data de recebimento deve estar no formato aaaa-mm-dd' },
  )
  receiptDate!: string;
}
