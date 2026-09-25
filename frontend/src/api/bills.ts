import { request } from '../lib/http';
import type {
  Bill,
  BillFilters,
  CreateBillInput,
  CreateInstallmentsInput,
  UpdateBillInput,
} from './types';

export const listBills = (filters: BillFilters) =>
  request<Bill[]>('/bills', { params: { ...filters } });

export const createBill = (input: CreateBillInput) =>
  request<Bill>('/bills', { method: 'POST', body: input });

export const createInstallments = (input: CreateInstallmentsInput) =>
  request<Bill[]>('/bills/installments', { method: 'POST', body: input });

export const deleteBillGroup = (groupId: string) =>
  request<null>(`/bills/installments/${groupId}`, { method: 'DELETE' });

export const updateBill = (id: string, input: UpdateBillInput) =>
  request<Bill>(`/bills/${id}`, { method: 'PATCH', body: input });

export const deleteBill = (id: string) =>
  request<null>(`/bills/${id}`, { method: 'DELETE' });

export const payBill = (id: string, paymentDate: string) =>
  request<Bill>(`/bills/${id}/payment`, {
    method: 'POST',
    body: { paymentDate },
  });

export const reversePayment = (id: string) =>
  request<Bill>(`/bills/${id}/payment`, { method: 'DELETE' });
