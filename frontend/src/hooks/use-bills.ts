import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBill,
  createInstallments,
  deleteBill,
  deleteBillGroup,
  listBills,
  payBill,
  reversePayment,
  updateBill,
} from '../api/bills';
import type {
  BillFilters,
  CreateBillInput,
  CreateInstallmentsInput,
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
    'Boleto cadastrado.',
    'Não foi possível cadastrar o boleto',
  );

export const useCreateInstallments = () =>
  useBillMutation(
    (input: CreateInstallmentsInput) => createInstallments(input),
    'NF e boletos cadastrados.',
    'Não foi possível cadastrar a NF e os boletos',
  );

export const useDeleteBillGroup = () =>
  useBillMutation(
    (groupId: string) => deleteBillGroup(groupId),
    'NF removida com todos os boletos.',
    'Não foi possível remover a NF',
  );

export const useUpdateBill = () =>
  useBillMutation(
    ({ id, input }: { id: string; input: UpdateBillInput }) =>
      updateBill(id, input),
    'Boleto atualizado.',
    'Não foi possível atualizar o boleto',
  );

export const useDeleteBill = () =>
  useBillMutation(
    (id: string) => deleteBill(id),
    'Boleto removido.',
    'Não foi possível remover o boleto',
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
