import { request } from '../lib/http';
import type {
  CashflowReport,
  ProjectCostReport,
  ReportPeriodFilters,
  WithholdingReport,
} from './types';

export const getCashflowReport = (filters: ReportPeriodFilters) =>
  request<CashflowReport>('/reports/cashflow', { params: { ...filters } });

export const getWithholdingsReport = (filters: ReportPeriodFilters) =>
  request<WithholdingReport>('/reports/withholdings', {
    params: { ...filters },
  });

export const getProjectCostsReport = (filters: ReportPeriodFilters) =>
  request<ProjectCostReport>('/reports/project-costs', {
    params: { ...filters },
  });
