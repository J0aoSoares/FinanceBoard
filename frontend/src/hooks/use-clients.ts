import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
} from '../api/clients';
import type { ClientInput } from '../api/types';
import { notifyApiError, notifySuccess } from '../lib/notify';

const AFFECTED_QUERIES = ['clients', 'projects'];

export const useClients = () =>
  useQuery({
    queryKey: ['clients'],
    queryFn: () => listClients(),
  });

export const useClient = (id: string | null) =>
  useQuery({
    queryKey: ['clients', 'detail', id],
    queryFn: () => getClient(id as string),
    enabled: id !== null,
  });

function useClientMutation<TVariables, TData>(
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

export const useCreateClient = () =>
  useClientMutation(
    (input: ClientInput & { name: string }) => createClient(input),
    'Cliente cadastrado.',
    'Não foi possível cadastrar o cliente',
  );

export const useUpdateClient = () =>
  useClientMutation(
    ({ id, input }: { id: string; input: ClientInput }) =>
      updateClient(id, input),
    'Cliente atualizado.',
    'Não foi possível atualizar o cliente',
  );

export const useDeleteClient = () =>
  useClientMutation(
    (id: string) => deleteClient(id),
    'Cliente excluído.',
    'Não foi possível excluir o cliente',
  );
