import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  payInvoice,
  reverseInvoicePayment,
  updateInvoice,
} from '../api/invoices';
import type {
  CreateInvoiceInput,
  InvoiceFilters,
  UpdateInvoiceInput,
} from '../api/types';
import { notifyApiError, notifySuccess } from '../lib/notify';

export const useInvoices = (filters: InvoiceFilters) =>
  useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => listInvoices(filters),
    placeholderData: (previous) => previous,
  });

export const useInvoice = (id: string) =>
  useQuery({
    queryKey: ['invoices', 'detail', id],
    queryFn: () => getInvoice(id),
  });

function useInvoiceMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
  errorTitle: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      notifySuccess(successMessage);
    },
    onError: (error) => notifyApiError(error, errorTitle),
  });
}

export const useCreateInvoice = () =>
  useInvoiceMutation(
    (input: CreateInvoiceInput) => createInvoice(input),
    'Fatura criada.',
    'Não foi possível criar a fatura',
  );

export const useUpdateInvoice = () =>
  useInvoiceMutation(
    ({ id, input }: { id: string; input: UpdateInvoiceInput }) =>
      updateInvoice(id, input),
    'Fatura atualizada.',
    'Não foi possível atualizar a fatura',
  );

export const useDeleteInvoice = () =>
  useInvoiceMutation(
    (id: string) => deleteInvoice(id),
    'Fatura excluída e contas liberadas.',
    'Não foi possível excluir a fatura',
  );

export const usePayInvoice = () =>
  useInvoiceMutation(
    ({ id, paymentDate }: { id: string; paymentDate: string }) =>
      payInvoice(id, paymentDate),
    'Pagamento registrado na fatura e nas contas.',
    'Não foi possível registrar o pagamento',
  );

export const useReverseInvoicePayment = () =>
  useInvoiceMutation(
    (id: string) => reverseInvoicePayment(id),
    'Pagamento estornado na fatura e nas contas.',
    'Não foi possível estornar o pagamento',
  );
