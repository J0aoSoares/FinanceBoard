import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProjectBillingDto } from './create-project-billing.dto';

export class UpdateProjectBillingDto extends PartialType(
  OmitType(CreateProjectBillingDto, ['paymentDate', 'bankId'] as const),
) {}
