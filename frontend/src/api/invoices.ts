import { request } from '../lib/http';
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceFilters,
  UpdateInvoiceInput,
} from './types';

export const listInvoices = (filters: InvoiceFilters) =>
  request<Invoice[]>('/invoices', { params: { ...filters } });

export const getInvoice = (id: string) => request<Invoice>(`/invoices/${id}`);

export const createInvoice = (input: CreateInvoiceInput) =>
  request<Invoice>('/invoices', { method: 'POST', body: input });

export const updateInvoice = (id: string, input: UpdateInvoiceInput) =>
  request<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: input });

export const deleteInvoice = (id: string) =>
  request<null>(`/invoices/${id}`, { method: 'DELETE' });

export const payInvoice = (id: string, paymentDate: string) =>
  request<Invoice>(`/invoices/${id}/payment`, {
    method: 'POST',
    body: { paymentDate },
  });

export const reverseInvoicePayment = (id: string) =>
  request<Invoice>(`/invoices/${id}/payment`, { method: 'DELETE' });
