import { request } from '../lib/http';
import type {
  CreateProjectInput,
  Project,
  ProjectFilters,
  UpdateProjectInput,
} from './types';

export const listProjects = (filters: ProjectFilters = {}) =>
  request<Project[]>('/projects', { params: { ...filters } });

export const createProject = (input: CreateProjectInput) =>
  request<Project>('/projects', { method: 'POST', body: input });

export const updateProject = (id: string, input: UpdateProjectInput) =>
  request<Project>(`/projects/${id}`, { method: 'PATCH', body: input });

export const deleteProject = (id: string) =>
  request<null>(`/projects/${id}`, { method: 'DELETE' });
