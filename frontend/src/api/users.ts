import { request } from '../lib/http';
import type {
  ChangePasswordInput,
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  User,
} from './types';

export const listUsers = () => request<User[]>('/users');

export const getUser = (id: string) => request<User>(`/users/${id}`);

export const createUser = (input: CreateUserInput) =>
  request<User>('/users', { method: 'POST', body: input });

export const updateUser = (id: string, input: UpdateUserInput) =>
  request<User>(`/users/${id}`, { method: 'PATCH', body: input });

/** A API desativa o usuário; nada é apagado. */
export const deactivateUser = (id: string) =>
  request<User>(`/users/${id}`, { method: 'DELETE' });

export const resetUserPassword = (id: string, input: ResetPasswordInput) =>
  request<User>(`/users/${id}/password`, { method: 'POST', body: input });

export const changeOwnPassword = (input: ChangePasswordInput) =>
  request<null>('/users/me/password', { method: 'POST', body: input });
