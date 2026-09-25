import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReceivable,
  deleteReceivable,
  getProjectBillingSummary,
  listReceivables,
  registerReceipt,
  removeReceipt,
  updateReceivable,
} from '../api/receivables';
import type {
  CreateReceivableInput,
  ReceivableFilters,
  UpdateReceivableInput,
} from '../api/types';
import { notifyApiError, notifySuccess } from '../lib/notify';

export const useReceivables = (filters: ReceivableFilters) =>
  useQuery({
    queryKey: ['receivables', filters],
    queryFn: () => listReceivables(filters),
    placeholderData: (previous) => previous,
  });

export const useProjectBillingSummary = (projectId: string) =>
  useQuery({
    queryKey: ['receivables', 'summary', projectId],
    queryFn: () => getProjectBillingSummary(projectId),
  });

function useReceivableMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
  errorTitle: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      notifySuccess(successMessage);
    },
    onError: (error) => notifyApiError(error, errorTitle),
  });
}

export const useCreateReceivable = () =>
  useReceivableMutation(
    (input: CreateReceivableInput) => createReceivable(input),
    'Nota de serviço cadastrada.',
    'Não foi possível cadastrar a nota de serviço',
  );

export const useUpdateReceivable = () =>
  useReceivableMutation(
    ({ id, input }: { id: string; input: UpdateReceivableInput }) =>
      updateReceivable(id, input),
    'Nota de serviço atualizada.',
    'Não foi possível atualizar a nota de serviço',
  );

export const useDeleteReceivable = () =>
  useReceivableMutation(
    (id: string) => deleteReceivable(id),
    'Nota de serviço removida.',
    'Não foi possível remover a nota de serviço',
  );

export const useRegisterReceipt = () =>
  useReceivableMutation(
    ({ id, receiptDate }: { id: string; receiptDate: string }) =>
      registerReceipt(id, receiptDate),
    'Recebimento registrado.',
    'Não foi possível registrar o recebimento',
  );

export const useRemoveReceipt = () =>
  useReceivableMutation(
    (id: string) => removeReceipt(id),
    'Recebimento estornado.',
    'Não foi possível estornar o recebimento',
  );
