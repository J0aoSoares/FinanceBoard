import { Controller, Get, Query } from '@nestjs/common';
import { CashflowService } from './cashflow.service';
import { ProjectResultService } from './project-result.service';
import { WithholdingService } from './withholding.service';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';

@Controller('reports')
export class ReportController {
  constructor(
    private readonly cashflowService: CashflowService,
    private readonly withholdingService: WithholdingService,
    private readonly projectResultService: ProjectResultService,
  ) {}

  @Get('cashflow')
  cashflow(@Query() query: ReportPeriodQueryDto) {
    return this.cashflowService.build(query);
  }

  @Get('withholdings')
  withholdings(@Query() query: ReportPeriodQueryDto) {
    return this.withholdingService.build(query);
  }

  @Get('project-results')
  projectResults(@Query() query: ReportPeriodQueryDto) {
    return this.projectResultService.build(query);
  }
}
