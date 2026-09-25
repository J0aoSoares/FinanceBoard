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
import { ReceivableService } from './receivable.service';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { ListReceivablesQueryDto } from './dto/list-receivables-query.dto';
import { ReceiveReceivableDto } from './dto/receive-receivable.dto';
import { ReceivableSummaryQueryDto } from './dto/summary-query.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';

@Controller('receivables')
export class ReceivableController {
  constructor(private readonly receivableService: ReceivableService) {}

  @Post()
  create(@Body() dto: CreateReceivableDto) {
    return this.receivableService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListReceivablesQueryDto) {
    return this.receivableService.findAll(query);
  }

  @Get('summary')
  summary(@Query() query: ReceivableSummaryQueryDto) {
    return this.receivableService.summary(query.projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.receivableService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReceivableDto) {
    return this.receivableService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.receivableService.remove(id);
  }

  @Post(':id/receipt')
  @HttpCode(HttpStatus.OK)
  registerReceipt(@Param('id') id: string, @Body() dto: ReceiveReceivableDto) {
    return this.receivableService.registerReceipt(id, dto);
  }

  @Delete(':id/receipt')
  removeReceipt(@Param('id') id: string) {
    return this.receivableService.removeReceipt(id);
  }
}
