import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReceivable,
  deleteReceivable,
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
    'Recebível cadastrado.',
    'Não foi possível cadastrar o recebível',
  );

export const useUpdateReceivable = () =>
  useReceivableMutation(
    ({ id, input }: { id: string; input: UpdateReceivableInput }) =>
      updateReceivable(id, input),
    'Recebível atualizado.',
    'Não foi possível atualizar o recebível',
  );

export const useDeleteReceivable = () =>
  useReceivableMutation(
    (id: string) => deleteReceivable(id),
    'Recebível removido.',
    'Não foi possível remover o recebível',
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
