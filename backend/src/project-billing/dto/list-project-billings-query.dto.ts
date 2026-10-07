import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { BillStatusFilter } from '../../bill/dto/list-bills-query.dto';
import { ProjectBillingDateBasis } from '../../common/project-billing-period.util';

export class ListProjectBillingsQueryDto {
  @IsOptional()
  @IsString({ message: 'Empresa deve ser um identificador válido' })
  companyId?: string;

  @IsOptional()
  @IsString({ message: 'Obra deve ser um identificador válido' })
  projectId?: string;

  @IsOptional()
  @IsString({ message: 'Banco deve ser um identificador válido' })
  bankId?: string;

  @IsOptional()
  @IsEnum(BillStatusFilter, {
    message: 'Status deve ser PENDING, PAID ou OVERDUE',
  })
  status?: BillStatusFilter;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Mês deve estar no formato aaaa-mm',
  })
  month?: string;

  @IsOptional()
  @IsEnum(ProjectBillingDateBasis, {
    message: 'Base de data deve ser due ou payment',
  })
  dateBasis?: ProjectBillingDateBasis;
}
