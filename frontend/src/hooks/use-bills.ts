import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBill,
  deleteBill,
  listBills,
  payBill,
  reversePayment,
  updateBill,
} from '../api/bills';
import type {
  BillFilters,
  CreateBillInput,
  UpdateBillInput,
} from '../api/types';
import { notifyApiError, notifySuccess } from '../lib/notify';

export const useBills = (filters: BillFilters) =>
  useQuery({
    queryKey: ['bills', filters],
    queryFn: () => listBills(filters),
    placeholderData: (previous) => previous,
  });

function useBillMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
  errorTitle: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      notifySuccess(successMessage);
    },
    onError: (error) => notifyApiError(error, errorTitle),
  });
}

export const useCreateBill = () =>
  useBillMutation(
    (input: CreateBillInput) => createBill(input),
    'Conta cadastrada.',
    'Não foi possível cadastrar a conta',
  );

export const useUpdateBill = () =>
  useBillMutation(
    ({ id, input }: { id: string; input: UpdateBillInput }) =>
      updateBill(id, input),
    'Conta atualizada.',
    'Não foi possível atualizar a conta',
  );

export const useDeleteBill = () =>
  useBillMutation(
    (id: string) => deleteBill(id),
    'Conta removida.',
    'Não foi possível remover a conta',
  );

export const usePayBill = () =>
  useBillMutation(
    ({ id, paymentDate }: { id: string; paymentDate: string }) =>
      payBill(id, paymentDate),
    'Pagamento registrado.',
    'Não foi possível registrar o pagamento',
  );

export const useReversePayment = () =>
  useBillMutation(
    (id: string) => reversePayment(id),
    'Pagamento estornado.',
    'Não foi possível estornar o pagamento',
  );
