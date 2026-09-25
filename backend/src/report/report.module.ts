import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { CashflowService } from './cashflow.service';
import { ProjectCostService } from './project-cost.service';
import { WithholdingService } from './withholding.service';

@Module({
  controllers: [ReportController],
  providers: [CashflowService, WithholdingService, ProjectCostService],
})
export class ReportModule {}
