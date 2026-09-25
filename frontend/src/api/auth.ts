import { request } from '../lib/http';
import type { LoginInput, LoginResponse, User } from './types';

export const login = (input: LoginInput) =>
  request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });

export const logout = (refreshToken: string) =>
  request<null>('/auth/logout', { method: 'POST', body: { refreshToken } });

export const me = () => request<User>('/auth/me');
