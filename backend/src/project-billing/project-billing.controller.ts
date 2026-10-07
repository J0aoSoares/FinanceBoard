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
import { CreateProjectBillingDto } from './dto/create-project-billing.dto';
import { ListProjectBillingsQueryDto } from './dto/list-project-billings-query.dto';
import { PayProjectBillingDto } from './dto/pay-project-billing.dto';
import { UpdateProjectBillingDto } from './dto/update-project-billing.dto';
import { ProjectBillingService } from './project-billing.service';

@Controller('project-billings')
export class ProjectBillingController {
  constructor(private readonly projectBillingService: ProjectBillingService) {}

  @Post()
  create(@Body() dto: CreateProjectBillingDto) {
    return this.projectBillingService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListProjectBillingsQueryDto) {
    return this.projectBillingService.findAll(query);
  }

  @Get('summary')
  summary(@Query() query: ListProjectBillingsQueryDto) {
    return this.projectBillingService.summary(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectBillingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectBillingDto) {
    return this.projectBillingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.projectBillingService.remove(id);
  }

  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  registerPayment(@Param('id') id: string, @Body() dto: PayProjectBillingDto) {
    return this.projectBillingService.registerPayment(id, dto);
  }

  @Delete(':id/payment')
  removePayment(@Param('id') id: string) {
    return this.projectBillingService.removePayment(id);
  }
}
