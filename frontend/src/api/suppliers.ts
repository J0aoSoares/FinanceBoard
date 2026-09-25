import { request } from '../lib/http';
import type {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
} from './types';

export const listSuppliers = () => request<Supplier[]>('/suppliers');

export const createSupplier = (input: CreateSupplierInput) =>
  request<Supplier>('/suppliers', { method: 'POST', body: input });

export const updateSupplier = (id: string, input: UpdateSupplierInput) =>
  request<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: input });

export const deleteSupplier = (id: string) =>
  request<null>(`/suppliers/${id}`, { method: 'DELETE' });
