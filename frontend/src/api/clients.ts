import { request } from '../lib/http';
import type { ClientDetail, ClientInput, ClientListItem } from './types';

export const listClients = (search?: string) =>
  request<ClientListItem[]>('/clients', { params: { search } });

export const getClient = (id: string) =>
  request<ClientDetail>(`/clients/${id}`);

export const createClient = (input: ClientInput & { name: string }) =>
  request<ClientDetail>('/clients', { method: 'POST', body: input });

export const updateClient = (id: string, input: ClientInput) =>
  request<ClientDetail>(`/clients/${id}`, { method: 'PATCH', body: input });

export const deleteClient = (id: string) =>
  request<null>(`/clients/${id}`, { method: 'DELETE' });
