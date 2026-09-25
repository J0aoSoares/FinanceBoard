import { useQuery } from '@tanstack/react-query';
import {
  getCashflowReport,
  getProjectCostsReport,
  getWithholdingsReport,
} from '../api/reports';
import type { ReportPeriodFilters } from '../api/types';

const reportQuery = <TData>(
  name: string,
  filters: ReportPeriodFilters | null,
  queryFn: (filters: ReportPeriodFilters) => Promise<TData>,
) => ({
  queryKey: ['reports', name, filters],
  queryFn: () => queryFn(filters as ReportPeriodFilters),
  enabled: filters !== null,
  placeholderData: (previous: TData | undefined) => previous,
});

export const useCashflowReport = (filters: ReportPeriodFilters | null) =>
  useQuery(reportQuery('cashflow', filters, getCashflowReport));

export const useWithholdingsReport = (filters: ReportPeriodFilters | null) =>
  useQuery(reportQuery('withholdings', filters, getWithholdingsReport));

export const useProjectCostsReport = (filters: ReportPeriodFilters | null) =>
  useQuery(reportQuery('project-costs', filters, getProjectCostsReport));
