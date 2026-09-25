import { request } from '../lib/http';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from './types';

export const listCompanies = () => request<Company[]>('/companies');

export const createCompany = (input: CreateCompanyInput) =>
  request<Company>('/companies', { method: 'POST', body: input });

export const updateCompany = (id: string, input: UpdateCompanyInput) =>
  request<Company>(`/companies/${id}`, { method: 'PATCH', body: input });

export const deleteCompany = (id: string) =>
  request<null>(`/companies/${id}`, { method: 'DELETE' });
