import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export enum BillStatusFilter {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum CashflowRegime {
  ACCRUAL = 'accrual',
  CASH = 'cash',
}

export enum BillDateBasis {
  ISSUE = 'issue',
  DUE = 'due',
  PAYMENT = 'payment',
}

export class ListBillsQueryDto {
  @IsOptional()
  @IsString({ message: 'Empresa deve ser um identificador válido' })
  companyId?: string;

  @IsOptional()
  @IsString({ message: 'Obra deve ser um identificador válido' })
  projectId?: string;

  @IsOptional()
  @IsString({ message: 'Categoria deve ser um identificador válido' })
  categoryId?: string;

  @IsOptional()
  @IsString({ message: 'Fornecedor deve ser um identificador válido' })
  supplierId?: string;

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
  @IsEnum(CashflowRegime, { message: 'Regime deve ser accrual ou cash' })
  regime?: CashflowRegime;

  @IsOptional()
  @IsEnum(BillDateBasis, {
    message: 'Base de data deve ser issue, due ou payment',
  })
  dateBasis?: BillDateBasis;
}
