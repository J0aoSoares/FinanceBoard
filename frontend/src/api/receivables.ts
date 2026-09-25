import { request } from '../lib/http';
import type {
  CreateReceivableInput,
  ProjectBillingSummary,
  Receivable,
  ReceivableFilters,
  UpdateReceivableInput,
} from './types';

export const listReceivables = (filters: ReceivableFilters) =>
  request<Receivable[]>('/receivables', { params: { ...filters } });

export const getProjectBillingSummary = (projectId: string) =>
  request<ProjectBillingSummary>('/receivables/summary', {
    params: { projectId },
  });

export const createReceivable = (input: CreateReceivableInput) =>
  request<Receivable>('/receivables', { method: 'POST', body: input });

export const updateReceivable = (id: string, input: UpdateReceivableInput) =>
  request<Receivable>(`/receivables/${id}`, { method: 'PATCH', body: input });

export const deleteReceivable = (id: string) =>
  request<null>(`/receivables/${id}`, { method: 'DELETE' });

export const registerReceipt = (id: string, receiptDate: string) =>
  request<Receivable>(`/receivables/${id}/receipt`, {
    method: 'POST',
    body: { receiptDate },
  });

export const removeReceipt = (id: string) =>
  request<Receivable>(`/receivables/${id}/receipt`, { method: 'DELETE' });
