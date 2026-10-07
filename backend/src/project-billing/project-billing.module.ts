import { Module } from '@nestjs/common';
import { ProjectBillingController } from './project-billing.controller';
import { ProjectBillingService } from './project-billing.service';
import { RetainageReleaseController } from './retainage-release.controller';
import { RetainageReleaseService } from './retainage-release.service';

@Module({
  controllers: [ProjectBillingController, RetainageReleaseController],
  providers: [ProjectBillingService, RetainageReleaseService],
})
export class ProjectBillingModule {}
