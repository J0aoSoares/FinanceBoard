import { request } from '../lib/http';
import type {
  CreateProjectBillingInput,
  CreateRetainageReleaseInput,
  ProjectBilling,
  ProjectBillingFilters,
  ProjectBillingTotals,
  ProjectRetainage,
  RetainageRelease,
  UpdateProjectBillingInput,
} from './types';

export const listProjectBillings = (filters: ProjectBillingFilters) =>
  request<ProjectBilling[]>('/project-billings', { params: { ...filters } });

export const getProjectBillingTotals = (filters: ProjectBillingFilters) =>
  request<ProjectBillingTotals>('/project-billings/summary', {
    params: { ...filters },
  });

export const createProjectBilling = (input: CreateProjectBillingInput) =>
  request<ProjectBilling>('/project-billings', { method: 'POST', body: input });

export const updateProjectBilling = (
  id: string,
  input: UpdateProjectBillingInput,
) =>
  request<ProjectBilling>(`/project-billings/${id}`, {
    method: 'PATCH',
    body: input,
  });

export const deleteProjectBilling = (id: string) =>
  request<null>(`/project-billings/${id}`, { method: 'DELETE' });

export const registerProjectBillingPayment = (
  id: string,
  paymentDate: string,
  bankId: string,
) =>
  request<ProjectBilling>(`/project-billings/${id}/payment`, {
    method: 'POST',
    body: { paymentDate, bankId },
  });

export const removeProjectBillingPayment = (id: string) =>
  request<ProjectBilling>(`/project-billings/${id}/payment`, {
    method: 'DELETE',
  });

export const getProjectRetainage = (projectId: string) =>
  request<ProjectRetainage>('/retainage-releases', { params: { projectId } });

export const createRetainageRelease = (input: CreateRetainageReleaseInput) =>
  request<RetainageRelease>('/retainage-releases', {
    method: 'POST',
    body: input,
  });

export const deleteRetainageRelease = (id: string) =>
  request<null>(`/retainage-releases/${id}`, { method: 'DELETE' });
