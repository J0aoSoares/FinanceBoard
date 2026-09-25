import { request } from '../lib/http';
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './types';

export const listCategories = () => request<Category[]>('/categories');

export const createCategory = (input: CreateCategoryInput) =>
  request<Category>('/categories', { method: 'POST', body: input });

export const updateCategory = (id: string, input: UpdateCategoryInput) =>
  request<Category>(`/categories/${id}`, { method: 'PATCH', body: input });

export const deleteCategory = (id: string) =>
  request<null>(`/categories/${id}`, { method: 'DELETE' });
