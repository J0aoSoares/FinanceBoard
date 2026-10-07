import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listBanks } from '../api/banks';
import {
  createProjectBilling,
  createRetainageRelease,
  deleteProjectBilling,
  deleteRetainageRelease,
  getProjectBillingTotals,
  getProjectRetainage,
  listProjectBillings,
  registerProjectBillingPayment,
  removeProjectBillingPayment,
  updateProjectBilling,
} from '../api/project-billings';
import type {
  CreateProjectBillingInput,
  CreateRetainageReleaseInput,
  ProjectBillingFilters,
  UpdateProjectBillingInput,
} from '../api/types';
import { notifyApiError, notifySuccess } from '../lib/notify';

const AFFECTED_QUERIES = ['project-billings', 'retainage', 'reports'];

export const useBanks = () =>
  useQuery({
    queryKey: ['banks'],
    queryFn: listBanks,
    staleTime: Infinity,
  });

export const useProjectBillings = (filters: ProjectBillingFilters) =>
  useQuery({
    queryKey: ['project-billings', 'list', filters],
    queryFn: () => listProjectBillings(filters),
    placeholderData: (previous) => previous,
  });

export const useProjectBillingTotals = (filters: ProjectBillingFilters) =>
  useQuery({
    queryKey: ['project-billings', 'summary', filters],
    queryFn: () => getProjectBillingTotals(filters),
    placeholderData: (previous) => previous,
  });

export const useProjectRetainage = (projectId: string) =>
  useQuery({
    queryKey: ['retainage', projectId],
    queryFn: () => getProjectRetainage(projectId),
  });

function useProjectBillingMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
  errorTitle: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of AFFECTED_QUERIES) {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
      notifySuccess(successMessage);
    },
    onError: (error) => notifyApiError(error, errorTitle),
  });
}

export const useCreateProjectBilling = () =>
  useProjectBillingMutation(
    (input: CreateProjectBillingInput) => createProjectBilling(input),
    'Fatura cadastrada.',
    'Não foi possível cadastrar a fatura',
  );

export const useUpdateProjectBilling = () =>
  useProjectBillingMutation(
    ({ id, input }: { id: string; input: UpdateProjectBillingInput }) =>
      updateProjectBilling(id, input),
    'Fatura atualizada.',
    'Não foi possível atualizar a fatura',
  );

export const useDeleteProjectBilling = () =>
  useProjectBillingMutation(
    (id: string) => deleteProjectBilling(id),
    'Fatura excluída.',
    'Não foi possível excluir a fatura',
  );

export const useRegisterProjectBillingPayment = () =>
  useProjectBillingMutation(
    ({
      id,
      paymentDate,
      bankId,
    }: {
      id: string;
      paymentDate: string;
      bankId: string;
    }) => registerProjectBillingPayment(id, paymentDate, bankId),
    'Pagamento registrado.',
    'Não foi possível registrar o pagamento',
  );

export const useRemoveProjectBillingPayment = () =>
  useProjectBillingMutation(
    (id: string) => removeProjectBillingPayment(id),
    'Pagamento estornado.',
    'Não foi possível estornar o pagamento',
  );

export const useCreateRetainageRelease = () =>
  useProjectBillingMutation(
    (input: CreateRetainageReleaseInput) => createRetainageRelease(input),
    'Devolução de caução registrada.',
    'Não foi possível registrar a devolução de caução',
  );

export const useDeleteRetainageRelease = () =>
  useProjectBillingMutation(
    (id: string) => deleteRetainageRelease(id),
    'Devolução de caução estornada.',
    'Não foi possível estornar a devolução de caução',
  );
