import { Controller, Get } from '@nestjs/common';
import { BankService } from './bank.service';

@Controller('banks')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get()
  findAll() {
    return this.bankService.findAll();
  }
}
