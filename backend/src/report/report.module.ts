import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { CashflowService } from './cashflow.service';
import { ProjectResultService } from './project-result.service';
import { WithholdingService } from './withholding.service';

@Module({
  controllers: [ReportController],
  providers: [CashflowService, WithholdingService, ProjectResultService],
})
export class ReportModule {}
