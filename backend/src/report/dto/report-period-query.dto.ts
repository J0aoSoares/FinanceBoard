import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { CashflowRegime } from '../../bill/dto/list-bills-query.dto';

export class ReportPeriodQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Mês inicial deve estar no formato aaaa-mm',
  })
  from!: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Mês final deve estar no formato aaaa-mm',
  })
  to!: string;

  @IsOptional()
  @IsEnum(CashflowRegime, { message: 'Regime deve ser accrual ou cash' })
  regime?: CashflowRegime;

  @IsOptional()
  @IsString({ message: 'Empresa deve ser um identificador válido' })
  companyId?: string;

  @IsOptional()
  @IsString({ message: 'Obra deve ser um identificador válido' })
  projectId?: string;
}
