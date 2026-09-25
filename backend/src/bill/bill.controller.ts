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
import { BillService } from './bill.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { ListBillsQueryDto } from './dto/list-bills-query.dto';
import { PayBillDto } from './dto/pay-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@Controller('bills')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  create(@Body() dto: CreateBillDto) {
    return this.billService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListBillsQueryDto) {
    return this.billService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.billService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBillDto) {
    return this.billService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.billService.remove(id);
  }

  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  registerPayment(@Param('id') id: string, @Body() dto: PayBillDto) {
    return this.billService.registerPayment(id, dto);
  }

  @Delete(':id/payment')
  removePayment(@Param('id') id: string) {
    return this.billService.removePayment(id);
  }
}
