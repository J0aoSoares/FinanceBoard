import { Controller, Get, Query } from '@nestjs/common';
import { CashflowService } from './cashflow.service';
import { ProjectCostService } from './project-cost.service';
import { WithholdingService } from './withholding.service';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

@Controller('reports')
export class ReportController {
  constructor(
    private readonly cashflowService: CashflowService,
    private readonly withholdingService: WithholdingService,
    private readonly projectCostService: ProjectCostService,
  ) {}

  @Get('cashflow')
  cashflow(@Query() query: ReportPeriodQueryDto) {
    return this.cashflowService.build(query);
  }

  @Get('withholdings')
  withholdings(@Query() query: ReportPeriodQueryDto) {
    return this.withholdingService.build(query);
  }

  @Get('project-costs')
  projectCosts(@Query() query: ReportPeriodQueryDto) {
    return this.projectCostService.build(query);
  }
}
