import type {
  CreateReceivableInput,
  Receivable,
  TaxType,
  UpdateReceivableInput,
} from '../../api/types';
import { apiDate, monthOf, type Month } from '../../lib/date';
import {
  compareMoney,
  isCanonicalMoney,
  netOfDeductions,
  sumMoney,
} from '../../lib/money';

export interface WithholdingRow {
  type: TaxType;
  amount: string;
}

export interface ReceivableFormValues {
  number: string;
  description: string;
  clientName: string;
  grossAmount: string;
  competence: Month | null;
  issueDate: string | null;
  dueDate: string | null;
  companyId: string | null;
  projectId: string | null;
  withholdings: WithholdingRow[];
}

export const emptyReceivableForm = (
  companyId?: string,
): ReceivableFormValues => ({
  number: '',
  description: '',
  clientName: '',
  grossAmount: '',
  competence: null,
  issueDate: null,
  dueDate: null,
  companyId: companyId ?? null,
  projectId: null,
  withholdings: [],
});

export const receivableToFormValues = (
  receivable: Receivable,
): ReceivableFormValues => {
  const competence = apiDate(receivable.competence);
  return {
    number: receivable.number ?? '',
    description: receivable.description,
    clientName: receivable.clientName,
    grossAmount: receivable.grossAmount,
    competence: competence ? monthOf(competence) : null,
    issueDate: apiDate(receivable.issueDate),
    dueDate: apiDate(receivable.dueDate),
    companyId: receivable.companyId,
    projectId: receivable.projectId,
    withholdings: receivable.withholdings.map((withholding) => ({
      type: withholding.type,
      amount: withholding.amount,
    })),
  };
};

export const receivableLabel = (receivable: Receivable) =>
  receivable.number
    ? `Nota ${receivable.number}`
    : `"${receivable.description}"`;

const positiveAmount = (value: string) => {
  if (!isCanonicalMoney(value)) {
    return 'Informe um valor válido';
  }
  return compareMoney(value, '0.00') <= 0
    ? 'O valor deve ser maior que zero'
    : null;
};

const required = (message: string) => (value: string | null) =>
  value && value.trim() !== '' ? null : message;

export const receivableFormValidation = {
  number: required('Número da nota é obrigatório'),
  description: required('Descrição do serviço é obrigatória'),
  clientName: required('Tomador é obrigatório'),
  companyId: required('Empresa emissora é obrigatória'),
  projectId: required('Obra é obrigatória'),
  competence: required('Competência é obrigatória'),
  issueDate: required('Data de emissão é obrigatória'),
  grossAmount: positiveAmount,
  dueDate: (value: string | null, values: ReceivableFormValues) => {
    if (!value) {
      return 'Data de vencimento é obrigatória';
    }
    if (values.issueDate && value < values.issueDate) {
      return 'Vencimento não pode ser anterior à emissão';
    }
    return null;
  },
  withholdings: {
    amount: (value: string, values: ReceivableFormValues) => {
      const invalid = positiveAmount(value);
      if (invalid) {
        return invalid;
      }
      if (!isCanonicalMoney(values.grossAmount)) {
        return null;
      }
      const amounts = values.withholdings
        .map((row) => row.amount)
        .filter(isCanonicalMoney);
      return compareMoney(sumMoney(amounts), values.grossAmount) >= 0
        ? 'A soma das retenções deve ser menor que o valor bruto'
        : null;
    },
  },
};

export const previewNetAmount = (values: ReceivableFormValues) =>
  netOfDeductions(
    values.grossAmount,
    values.withholdings.map((row) => row.amount),
  );

export function buildCreatePayload(
  values: ReceivableFormValues,
): CreateReceivableInput {
  return {
    number: values.number.trim(),
    description: values.description.trim(),
    clientName: values.clientName.trim(),
    grossAmount: values.grossAmount,
    competence: values.competence!,
    issueDate: values.issueDate!,
    dueDate: values.dueDate!,
    companyId: values.companyId!,
    projectId: values.projectId!,
    withholdings: values.withholdings.map((row) => ({
      type: row.type,
      amount: row.amount,
    })),
  };
}

export const buildUpdatePayload = (
  values: ReceivableFormValues,
): UpdateReceivableInput => buildCreatePayload(values);
