import type {
  Bill,
  CreateBillInput,
  TaxType,
  UpdateBillInput,
} from '../../api/types';
import { apiDate } from '../../lib/date';
import {
  compareMoney,
  isCanonicalMoney,
  subtractMoney,
  sumMoney,
} from '../../lib/money';

export interface WithholdingRow {
  type: TaxType;
  amount: string;
}

export interface BillFormValues {
  documentNumber: string;
  grossAmount: string;
  issueDate: string | null;
  dueDate: string | null;
  companyId: string | null;
  projectId: string | null;
  categoryId: string | null;
  supplierId: string | null;
  withholdings: WithholdingRow[];
}

export const emptyBillForm = (companyId?: string): BillFormValues => ({
  documentNumber: '',
  grossAmount: '',
  issueDate: null,
  dueDate: null,
  companyId: companyId ?? null,
  projectId: null,
  categoryId: null,
  supplierId: null,
  withholdings: [],
});

export const billToFormValues = (bill: Bill): BillFormValues => ({
  documentNumber: bill.documentNumber,
  grossAmount: bill.grossAmount,
  issueDate: apiDate(bill.issueDate),
  dueDate: apiDate(bill.dueDate),
  companyId: bill.companyId,
  projectId: bill.projectId,
  categoryId: bill.categoryId,
  supplierId: bill.supplierId,
  withholdings: bill.taxWithholdings.map((withholding) => ({
    type: withholding.type,
    amount: withholding.amount,
  })),
});

const requiredAmount = (value: string) => {
  if (!isCanonicalMoney(value)) {
    return 'Informe um valor válido';
  }
  if (compareMoney(value, '0.00') <= 0) {
    return 'O valor deve ser maior que zero';
  }
  return null;
};

export const billFormValidation = {
  documentNumber: (value: string) =>
    value.trim() === '' ? 'Número do documento é obrigatório' : null,
  grossAmount: requiredAmount,
  issueDate: (value: string | null) =>
    value ? null : 'Data de emissão é obrigatória',
  dueDate: (value: string | null, values: BillFormValues) => {
    if (!value) {
      return 'Data de vencimento é obrigatória';
    }
    if (values.issueDate && value < values.issueDate) {
      return 'Vencimento não pode ser anterior à emissão';
    }
    return null;
  },
  companyId: (value: string | null) => (value ? null : 'Empresa é obrigatória'),
  categoryId: (value: string | null) =>
    value ? null : 'Categoria é obrigatória',
  supplierId: (value: string | null) =>
    value ? null : 'Fornecedor é obrigatório',
  withholdings: {
    amount: (value: string, values: BillFormValues) => {
      const invalid = requiredAmount(value);
      if (invalid) {
        return invalid;
      }
      if (!isCanonicalMoney(values.grossAmount)) {
        return null;
      }
      const total = sumMoney(
        values.withholdings
          .map((row) => row.amount)
          .filter((amount) => isCanonicalMoney(amount)),
      );
      return compareMoney(total, values.grossAmount) >= 0
        ? 'A soma das retenções deve ser menor que o valor bruto'
        : null;
    },
  },
};

export function previewNetAmount(values: BillFormValues): string | null {
  if (!isCanonicalMoney(values.grossAmount)) {
    return null;
  }
  const amounts = values.withholdings
    .map((row) => row.amount)
    .filter((amount) => isCanonicalMoney(amount));
  if (amounts.length !== values.withholdings.length) {
    return null;
  }
  const total = sumMoney(amounts);
  return compareMoney(total, values.grossAmount) >= 0
    ? null
    : subtractMoney(values.grossAmount, total);
}

export function buildCreatePayload(values: BillFormValues): CreateBillInput {
  const payload: CreateBillInput = {
    documentNumber: values.documentNumber.trim(),
    grossAmount: values.grossAmount,
    issueDate: values.issueDate!,
    dueDate: values.dueDate!,
    companyId: values.companyId!,
    categoryId: values.categoryId!,
    supplierId: values.supplierId!,
  };

  if (values.projectId) {
    payload.projectId = values.projectId;
  }
  if (values.withholdings.length > 0) {
    payload.withholdings = values.withholdings.map((row) => ({
      type: row.type,
      amount: row.amount,
    }));
  }

  return payload;
}

export function buildUpdatePayload(values: BillFormValues): UpdateBillInput {
  return {
    ...buildCreatePayload(values),
    projectId: values.projectId,
    withholdings: values.withholdings.map((row) => ({
      type: row.type,
      amount: row.amount,
    })),
  };
}
