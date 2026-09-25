import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeOwnPassword,
  createUser,
  deactivateUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from '../api/users';
import type {
  ChangePasswordInput,
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
} from '../api/types';
import { notifyApiError, notifySuccess } from '../lib/notify';

export const useUsers = () =>
  useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers(),
  });

function useUserMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
  errorTitle: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      notifySuccess(successMessage);
    },
    onError: (error) => notifyApiError(error, errorTitle),
  });
}

export const useCreateUser = () =>
  useUserMutation(
    (input: CreateUserInput) => createUser(input),
    'Usuário cadastrado.',
    'Não foi possível cadastrar o usuário',
  );

export const useUpdateUser = () =>
  useUserMutation(
    ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUser(id, input),
    'Usuário atualizado.',
    'Não foi possível atualizar o usuário',
  );

export const useDeactivateUser = () =>
  useUserMutation(
    (id: string) => deactivateUser(id),
    'Usuário desativado. As sessões abertas foram encerradas.',
    'Não foi possível desativar o usuário',
  );

export const useResetUserPassword = () =>
  useUserMutation(
    ({ id, input }: { id: string; input: ResetPasswordInput }) =>
      resetUserPassword(id, input),
    'Senha redefinida. As sessões abertas foram encerradas.',
    'Não foi possível redefinir a senha',
  );

export const useChangeOwnPassword = () =>
  useMutation({
    mutationFn: (input: ChangePasswordInput) => changeOwnPassword(input),
    onSuccess: () => notifySuccess('Senha alterada.'),
    onError: (error) =>
      notifyApiError(error, 'Não foi possível alterar a senha'),
  });
