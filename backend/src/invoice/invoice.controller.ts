import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListInvoicesQueryDto) {
    return this.invoiceService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(id);
  }

  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  registerPayment(@Param('id') id: string, @Body() dto: PayInvoiceDto) {
    return this.invoiceService.registerPayment(id, dto);
  }

  @Delete(':id/payment')
  removePayment(@Param('id') id: string) {
    return this.invoiceService.removePayment(id);
  }
}
