import { request } from '../lib/http';
import type {
  CashflowReport,
  ProjectResultReport,
  ReportPeriodFilters,
  WithholdingReport,
} from './types';

export const getCashflowReport = (filters: ReportPeriodFilters) =>
  request<CashflowReport>('/reports/cashflow', { params: { ...filters } });

export const getWithholdingsReport = (filters: ReportPeriodFilters) =>
  request<WithholdingReport>('/reports/withholdings', {
    params: { ...filters },
  });

export const getProjectResultsReport = (filters: ReportPeriodFilters) =>
  request<ProjectResultReport>('/reports/project-results', {
    params: { ...filters },
  });
