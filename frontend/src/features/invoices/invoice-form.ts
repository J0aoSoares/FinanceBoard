import type {
  CreateInvoiceInput,
  Invoice,
  UpdateInvoiceInput,
} from '../../api/types';
import { apiDate } from '../../lib/date';

export interface InvoiceFormValues {
  number: string;
  companyId: string | null;
  supplierId: string | null;
  dueDate: string | null;
}

export const emptyInvoiceForm = (companyId?: string): InvoiceFormValues => ({
  number: '',
  companyId: companyId ?? null,
  supplierId: null,
  dueDate: null,
});

export const invoiceToFormValues = (invoice: Invoice): InvoiceFormValues => ({
  number: invoice.number,
  companyId: invoice.companyId,
  supplierId: invoice.supplierId,
  dueDate: apiDate(invoice.dueDate),
});

export const invoiceFormValidation = {
  number: (value: string) =>
    value.trim() === '' ? 'Número da fatura é obrigatório' : null,
  companyId: (value: string | null) => (value ? null : 'Empresa é obrigatória'),
  dueDate: (value: string | null) =>
    value ? null : 'Data de vencimento é obrigatória',
};

export function buildCreatePayload(
  values: InvoiceFormValues,
  selectedIds: string[],
): CreateInvoiceInput {
  const payload: CreateInvoiceInput = {
    number: values.number.trim(),
    companyId: values.companyId!,
    dueDate: values.dueDate!,
    billIds: [...new Set(selectedIds)],
  };

  if (values.supplierId) {
    payload.supplierId = values.supplierId;
  }

  return payload;
}

export function buildDetailsPayload(
  values: InvoiceFormValues,
): UpdateInvoiceInput {
  return {
    number: values.number.trim(),
    supplierId: values.supplierId,
    dueDate: values.dueDate!,
  };
}
