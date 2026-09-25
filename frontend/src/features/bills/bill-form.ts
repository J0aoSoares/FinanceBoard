import type {
  Bill,
  CreateBillInput,
  CreateInstallmentsInput,
  UpdateBillInput,
} from '../../api/types';
import { apiDate, monthlyDueDates } from '../../lib/date';
import {
  digitableLineError,
  formatDigitableLine,
  normalizeDigitableLine,
} from '../../lib/digitable-line';
import {
  duplicatedLabels,
  installmentLabels,
  type LabelPattern,
} from '../../lib/installment-labels';
import {
  compareMoney,
  formatCurrency,
  isCanonicalMoney,
  splitMoney,
  subtractMoney,
  sumMoney,
  type Money,
} from '../../lib/money';

export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 60;

export interface InstallmentRow {
  label: string;
  dueDate: string | null;
  amount: Money;
  digitableLine: string;
}

export interface InstallmentSettings {
  count: number;
  labelPattern: LabelPattern;
  firstDueDate: string | null;
  intervalMonths: number;
}

export interface BillFormValues {
  supplierId: string | null;
  description: string;
  categoryId: string | null;
  projectId: string | null;
  companyId: string | null;
  issueDate: string | null;
  amount: Money;
  dueDate: string | null;
  digitableLine: string;
  split: boolean;
  settings: InstallmentSettings;
  installments: InstallmentRow[];
}

export const emptyBillForm = (companyId?: string): BillFormValues => ({
  supplierId: null,
  description: '',
  categoryId: null,
  projectId: null,
  companyId: companyId ?? null,
  issueDate: null,
  amount: '',
  dueDate: null,
  digitableLine: '',
  split: false,
  settings: {
    count: 2,
    labelPattern: 'numeric',
    firstDueDate: null,
    intervalMonths: 1,
  },
  installments: [],
});

export const billToFormValues = (bill: Bill): BillFormValues => ({
  ...emptyBillForm(bill.companyId),
  supplierId: bill.supplierId,
  description: bill.description,
  categoryId: bill.categoryId,
  projectId: bill.projectId,
  issueDate: apiDate(bill.issueDate),
  amount: bill.netAmount,
  dueDate: apiDate(bill.dueDate),
  digitableLine: bill.digitableLine
    ? formatDigitableLine(bill.digitableLine)
    : '',
});

export const billLabel = (bill: Bill) =>
  bill.installmentLabel
    ? `${bill.description} · boleto ${bill.installmentLabel}`
    : bill.description;

export const hasLegacyWithholdings = (bill: Bill | null) =>
  bill !== null && bill.taxWithholdings.length > 0;

const isValidCount = (count: number) =>
  Number.isInteger(count) &&
  count >= MIN_INSTALLMENTS &&
  count <= MAX_INSTALLMENTS;

export function buildInstallmentRows(
  settings: InstallmentSettings,
  total: Money,
  previous: InstallmentRow[],
): InstallmentRow[] {
  if (!isValidCount(settings.count)) {
    return previous;
  }
  const labels = installmentLabels(
    settings.labelPattern,
    settings.count,
    previous.map((row) => row.label),
  );
  const dueDates = settings.firstDueDate
    ? monthlyDueDates(
        settings.firstDueDate,
        settings.count,
        Math.max(1, settings.intervalMonths),
      )
    : [];
  const amounts = isCanonicalMoney(total)
    ? splitMoney(total, settings.count)
    : [];

  return labels.map((label, index) => ({
    label,
    dueDate: dueDates[index] ?? previous[index]?.dueDate ?? null,
    amount: amounts[index] ?? '',
    digitableLine: previous[index]?.digitableLine ?? '',
  }));
}

export function redistributeAmounts(
  rows: InstallmentRow[],
  total: Money,
): InstallmentRow[] {
  if (!isCanonicalMoney(total) || rows.length === 0) {
    return rows;
  }
  const amounts = splitMoney(total, rows.length);
  return rows.map((row, index) => ({ ...row, amount: amounts[index] }));
}

export function installmentsSum(rows: InstallmentRow[]): Money | null {
  const amounts = rows.map((row) => row.amount);
  return amounts.every(isCanonicalMoney) ? sumMoney(amounts) : null;
}

export function installmentsDifference(values: BillFormValues): Money | null {
  const sum = installmentsSum(values.installments);
  if (sum === null || !isCanonicalMoney(values.amount)) {
    return null;
  }
  return subtractMoney(values.amount, sum);
}

const positiveAmount = (value: string) => {
  if (!isCanonicalMoney(value)) {
    return 'Informe um valor válido';
  }
  if (compareMoney(value, '0.00') <= 0) {
    return 'O valor deve ser maior que zero';
  }
  return null;
};

const digitableLine = (value: string) =>
  value.trim() === '' ? null : digitableLineError(value);

const notBeforeIssue = (value: string | null, values: BillFormValues) =>
  value && values.issueDate && value < values.issueDate
    ? 'Vencimento não pode ser anterior à data da compra'
    : null;

export const billFormValidation = {
  supplierId: (value: string | null) =>
    value ? null : 'Fornecedor é obrigatório',
  description: (value: string) =>
    value.trim() === '' ? 'Descrição é obrigatória' : null,
  categoryId: (value: string | null) =>
    value ? null : 'Categoria é obrigatória',
  companyId: (value: string | null) => (value ? null : 'Empresa é obrigatória'),
  issueDate: (value: string | null) =>
    value ? null : 'Data da compra é obrigatória',
  amount: (value: string, values: BillFormValues) => {
    const invalid = positiveAmount(value);
    if (invalid || !values.split) {
      return invalid;
    }
    const difference = installmentsDifference(values);
    return difference !== null && compareMoney(difference, '0.00') !== 0
      ? `A soma dos boletos difere do valor total em ${formatCurrency(difference.replace('-', ''))}`
      : null;
  },
  dueDate: (value: string | null, values: BillFormValues) => {
    if (values.split) {
      return null;
    }
    return value
      ? notBeforeIssue(value, values)
      : 'Data de vencimento é obrigatória';
  },
  digitableLine: (value: string, values: BillFormValues) =>
    values.split ? null : digitableLine(value),
  settings: {
    count: (value: number, values: BillFormValues) =>
      !values.split || isValidCount(value)
        ? null
        : `Informe de ${MIN_INSTALLMENTS} a ${MAX_INSTALLMENTS} boletos`,
    firstDueDate: (value: string | null, values: BillFormValues) =>
      !values.split || value ? null : 'Primeiro vencimento é obrigatório',
  },
  installments: {
    label: (value: string, values: BillFormValues) => {
      if (value.trim() === '') {
        return 'Rótulo obrigatório';
      }
      return duplicatedLabels(values.installments.map((row) => row.label)).has(
        value.trim().toLocaleUpperCase('pt-BR'),
      )
        ? 'Rótulo repetido'
        : null;
    },
    dueDate: (value: string | null, values: BillFormValues) =>
      value ? notBeforeIssue(value, values) : 'Vencimento obrigatório',
    amount: positiveAmount,
    digitableLine,
  },
};

const optionalDigitableLine = (value: string) =>
  value.trim() === '' ? undefined : normalizeDigitableLine(value);

function buildFields(values: BillFormValues) {
  const fields = {
    description: values.description.trim(),
    issueDate: values.issueDate!,
    companyId: values.companyId!,
    categoryId: values.categoryId!,
    supplierId: values.supplierId!,
  };
  return values.projectId ? { ...fields, projectId: values.projectId } : fields;
}

export function buildCreatePayload(values: BillFormValues): CreateBillInput {
  const payload: CreateBillInput = {
    ...buildFields(values),
    amount: values.amount,
    dueDate: values.dueDate!,
  };
  const line = optionalDigitableLine(values.digitableLine);
  return line ? { ...payload, digitableLine: line } : payload;
}

export function buildUpdatePayload(values: BillFormValues): UpdateBillInput {
  return {
    ...buildFields(values),
    amount: values.amount,
    dueDate: values.dueDate!,
    projectId: values.projectId,
    digitableLine: optionalDigitableLine(values.digitableLine) ?? null,
  };
}

export function buildInstallmentsPayload(
  values: BillFormValues,
): CreateInstallmentsInput {
  return {
    ...buildFields(values),
    totalAmount: values.amount,
    installments: values.installments.map((row) => {
      const installment = {
        label: row.label.trim(),
        dueDate: row.dueDate!,
        amount: row.amount,
      };
      const line = optionalDigitableLine(row.digitableLine);
      return line ? { ...installment, digitableLine: line } : installment;
    }),
  };
}
