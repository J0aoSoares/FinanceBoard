import type {
  CreateReceivableInput,
  Receivable,
  UpdateReceivableInput,
} from '../../api/types';
import { apiDate } from '../../lib/date';
import { compareMoney, isCanonicalMoney } from '../../lib/money';

export interface ReceivableFormValues {
  description: string;
  clientName: string;
  amount: string;
  issueDate: string | null;
  dueDate: string | null;
  companyId: string | null;
  projectId: string | null;
}

export const emptyReceivableForm = (
  companyId?: string,
): ReceivableFormValues => ({
  description: '',
  clientName: '',
  amount: '',
  issueDate: null,
  dueDate: null,
  companyId: companyId ?? null,
  projectId: null,
});

export const receivableToFormValues = (
  receivable: Receivable,
): ReceivableFormValues => ({
  description: receivable.description,
  clientName: receivable.clientName,
  amount: receivable.amount,
  issueDate: apiDate(receivable.issueDate),
  dueDate: apiDate(receivable.dueDate),
  companyId: receivable.companyId,
  projectId: receivable.projectId,
});

export const receivableFormValidation = {
  description: (value: string) =>
    value.trim() === '' ? 'Descrição é obrigatória' : null,
  clientName: (value: string) =>
    value.trim() === '' ? 'Nome do cliente é obrigatório' : null,
  amount: (value: string) => {
    if (!isCanonicalMoney(value)) {
      return 'Informe um valor válido';
    }
    return compareMoney(value, '0.00') <= 0
      ? 'O valor deve ser maior que zero'
      : null;
  },
  issueDate: (value: string | null) =>
    value ? null : 'Data de emissão é obrigatória',
  dueDate: (value: string | null, values: ReceivableFormValues) => {
    if (!value) {
      return 'Data de vencimento é obrigatória';
    }
    if (values.issueDate && value < values.issueDate) {
      return 'Vencimento não pode ser anterior à emissão';
    }
    return null;
  },
  companyId: (value: string | null) => (value ? null : 'Empresa é obrigatória'),
};

export function buildCreatePayload(
  values: ReceivableFormValues,
): CreateReceivableInput {
  const payload: CreateReceivableInput = {
    description: values.description.trim(),
    clientName: values.clientName.trim(),
    amount: values.amount,
    issueDate: values.issueDate!,
    dueDate: values.dueDate!,
    companyId: values.companyId!,
  };

  if (values.projectId) {
    payload.projectId = values.projectId;
  }

  return payload;
}

export function buildUpdatePayload(
  values: ReceivableFormValues,
): UpdateReceivableInput {
  return {
    ...buildCreatePayload(values),
    projectId: values.projectId,
  };
}
