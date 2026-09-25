import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../api/categories';
import {
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany,
} from '../api/companies';
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from '../api/projects';
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from '../api/suppliers';
import type {
  CreateCategoryInput,
  CreateCompanyInput,
  CreateProjectInput,
  CreateSupplierInput,
  Supplier,
  UpdateCategoryInput,
  UpdateCompanyInput,
  UpdateProjectInput,
  UpdateSupplierInput,
} from '../api/types';
import { ApiError } from '../lib/http';
import { nameKey } from '../lib/name-key';
import { notifyApiError, notifySuccess } from '../lib/notify';

const CATALOG_STALE_TIME = 5 * 60 * 1000;

export const useCompanies = () =>
  useQuery({
    queryKey: ['companies'],
    queryFn: () => listCompanies(),
    staleTime: CATALOG_STALE_TIME,
  });

export const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects(),
    staleTime: CATALOG_STALE_TIME,
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(),
    staleTime: CATALOG_STALE_TIME,
  });

export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: () => listSuppliers(),
    staleTime: CATALOG_STALE_TIME,
  });

function useCatalogMutation<TVariables, TData>(
  entityKey: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
  errorTitle: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityKey] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      notifySuccess(successMessage);
    },
    onError: (error) => notifyApiError(error, errorTitle),
  });
}

export const useCreateCompany = () =>
  useCatalogMutation(
    'companies',
    (input: CreateCompanyInput) => createCompany(input),
    'Empresa cadastrada.',
    'Não foi possível cadastrar a empresa',
  );

export const useUpdateCompany = () =>
  useCatalogMutation(
    'companies',
    ({ id, input }: { id: string; input: UpdateCompanyInput }) =>
      updateCompany(id, input),
    'Empresa atualizada.',
    'Não foi possível atualizar a empresa',
  );

export const useDeleteCompany = () =>
  useCatalogMutation(
    'companies',
    (id: string) => deleteCompany(id),
    'Empresa removida.',
    'Não foi possível remover a empresa',
  );

export const useCreateProject = () =>
  useCatalogMutation(
    'projects',
    (input: CreateProjectInput) => createProject(input),
    'Obra cadastrada.',
    'Não foi possível cadastrar a obra',
  );

export const useUpdateProject = () =>
  useCatalogMutation(
    'projects',
    ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      updateProject(id, input),
    'Obra atualizada.',
    'Não foi possível atualizar a obra',
  );

export const useDeleteProject = () =>
  useCatalogMutation(
    'projects',
    (id: string) => deleteProject(id),
    'Obra removida.',
    'Não foi possível remover a obra',
  );

export const useCreateSupplier = () =>
  useCatalogMutation(
    'suppliers',
    (input: CreateSupplierInput) => createSupplier(input),
    'Fornecedor cadastrado.',
    'Não foi possível cadastrar o fornecedor',
  );

export function useCreateSupplierByName() {
  const queryClient = useQueryClient();

  const findByName = async (name: string) => {
    const suppliers = await queryClient.fetchQuery({
      queryKey: ['suppliers'],
      queryFn: () => listSuppliers(),
      staleTime: 0,
    });
    return (
      suppliers.find((supplier) => nameKey(supplier.name) === nameKey(name)) ??
      null
    );
  };

  return useMutation({
    mutationFn: async (name: string) => {
      try {
        return { supplier: await createSupplier({ name }), created: true };
      } catch (error) {
        const existing =
          error instanceof ApiError && error.status === 409
            ? await findByName(name)
            : null;
        if (!existing) {
          throw error;
        }
        return { supplier: existing, created: false };
      }
    },
    onSuccess: ({ supplier, created }) => {
      queryClient.setQueryData<Supplier[]>(['suppliers'], (current) =>
        current && !current.some((item) => item.id === supplier.id)
          ? [...current, supplier]
          : current,
      );
      if (created) {
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        notifySuccess('Fornecedor cadastrado.');
      }
    },
    onError: (error) =>
      notifyApiError(error, 'Não foi possível cadastrar o fornecedor'),
  });
}

export const useUpdateSupplier = () =>
  useCatalogMutation(
    'suppliers',
    ({ id, input }: { id: string; input: UpdateSupplierInput }) =>
      updateSupplier(id, input),
    'Fornecedor atualizado.',
    'Não foi possível atualizar o fornecedor',
  );

export const useDeleteSupplier = () =>
  useCatalogMutation(
    'suppliers',
    (id: string) => deleteSupplier(id),
    'Fornecedor removido.',
    'Não foi possível remover o fornecedor',
  );

export const useCreateCategory = () =>
  useCatalogMutation(
    'categories',
    (input: CreateCategoryInput) => createCategory(input),
    'Categoria cadastrada.',
    'Não foi possível cadastrar a categoria',
  );

export const useUpdateCategory = () =>
  useCatalogMutation(
    'categories',
    ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    'Categoria atualizada.',
    'Não foi possível atualizar a categoria',
  );

export const useDeleteCategory = () =>
  useCatalogMutation(
    'categories',
    (id: string) => deleteCategory(id),
    'Categoria removida.',
    'Não foi possível remover a categoria',
  );
