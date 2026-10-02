import type {
  Bill,
  CreateInstallmentsInput,
  UpdateBillInput,
} from '../../api/types';
import { addMonthsClamped, apiDate, monthlyDueDates } from '../../lib/date.ts';
import {
  boletoReferenceError,
  formatDigitableLine,
  normalizeBoletoReference,
} from '../../lib/digitable-line.ts';
import {
  alphaLabel,
  duplicatedLabels,
  installmentLabels,
  type LabelPattern,
} from '../../lib/installment-labels.ts';
import {
  compareMoney,
  formatCurrency,
  isCanonicalMoney,
  splitMoney,
  subtractMoney,
  sumMoney,
  type Money,
} from '../../lib/money.ts';

export const MAX_INSTALLMENTS = 60;

export interface InstallmentRow {
  label: string;
  dueDate: string | null;
  amount: Money;
  digitableLine: string;
  paid: boolean;
  paymentDate: string | null;
}

export interface GeneratorSettings {
  count: number;
  firstDueDate: string | null;
  intervalMonths: number;
}

export interface BillFormValues {
  supplierId: string | null;
  documentNumber: string;
  description: string;
  categoryId: string | null;
  projectId: string | null;
  companyId: string | null;
  issueDate: string | null;
  totalAmount: Money;
  labelPattern: LabelPattern;
  installments: InstallmentRow[];
  generator: GeneratorSettings;
}

const emptyRow = (label: string): InstallmentRow => ({
  label,
  dueDate: null,
  amount: '',
  digitableLine: '',
  paid: false,
  paymentDate: null,
});

export const emptyBillForm = (companyId?: string): BillFormValues => ({
  supplierId: null,
  documentNumber: '',
  description: '',
  categoryId: null,
  projectId: null,
  companyId: companyId ?? null,
  issueDate: null,
  totalAmount: '',
  labelPattern: 'numeric',
  installments: [emptyRow('1')],
  generator: { count: 2, firstDueDate: null, intervalMonths: 1 },
});

export const billToFormValues = (bill: Bill): BillFormValues => ({
  ...emptyBillForm(bill.companyId),
  supplierId: bill.supplierId,
  documentNumber: bill.documentNumber,
  description: bill.description,
  categoryId: bill.categoryId,
  projectId: bill.projectId,
  issueDate: apiDate(bill.issueDate),
  labelPattern: 'manual',
  installments: [
    {
      label: bill.installmentLabel ?? '',
      dueDate: apiDate(bill.dueDate),
      amount: bill.netAmount,
      digitableLine: bill.digitableLine
        ? formatDigitableLine(bill.digitableLine)
        : '',
      paid: false,
      paymentDate: null,
    },
  ],
});

export const nfLabel = (documentNumber: string) =>
  /^nf/i.test(documentNumber.trim()) ? documentNumber : `NF ${documentNumber}`;

export const billLabel = (bill: Bill) =>
  bill.installmentLabel && (bill.group?.billCount ?? 1) > 1
    ? `${nfLabel(bill.documentNumber)} · boleto ${bill.installmentLabel}`
    : nfLabel(bill.documentNumber);

export const hasLegacyWithholdings = (bill: Bill | null) =>
  bill !== null && bill.taxWithholdings.length > 0;

const hasTotal = (values: Pick<BillFormValues, 'totalAmount'>) =>
  values.totalAmount.trim() !== '';

export function generateRows(
  values: Pick<BillFormValues, 'generator' | 'labelPattern' | 'totalAmount'>,
  previous: InstallmentRow[],
): InstallmentRow[] {
  const { count, firstDueDate, intervalMonths } = values.generator;
  const labels = installmentLabels(
    values.labelPattern,
    count,
    previous.map((row) => row.label),
  );
  const dueDates = firstDueDate
    ? monthlyDueDates(firstDueDate, count, Math.max(1, intervalMonths))
    : [];
  const amounts =
    hasTotal(values) && isCanonicalMoney(values.totalAmount)
      ? splitMoney(values.totalAmount, count)
      : [];

  return labels.map((label, index) => ({
    label,
    dueDate: dueDates[index] ?? previous[index]?.dueDate ?? null,
    amount: amounts[index] ?? previous[index]?.amount ?? '',
    digitableLine: previous[index]?.digitableLine ?? '',
    paid: previous[index]?.paid ?? false,
    paymentDate: previous[index]?.paymentDate ?? null,
  }));
}

export function nextRow(
  values: Pick<BillFormValues, 'installments' | 'labelPattern' | 'generator'>,
): InstallmentRow {
  const rows = values.installments;
  const label =
    values.labelPattern === 'numeric'
      ? String(rows.length + 1)
      : values.labelPattern === 'alpha'
        ? alphaLabel(rows.length)
        : '';
  const lastDue = rows.at(-1)?.dueDate ?? null;
  return {
    ...emptyRow(label),
    dueDate: lastDue
      ? addMonthsClamped(lastDue, Math.max(1, values.generator.intervalMonths))
      : null,
  };
}

export function relabelRows(
  rows: InstallmentRow[],
  pattern: LabelPattern,
): InstallmentRow[] {
  const labels = installmentLabels(
    pattern,
    rows.length,
    rows.map((row) => row.label),
  );
  return rows.map((row, index) => ({ ...row, label: labels[index] }));
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
  return amounts.length > 0 && amounts.every(isCanonicalMoney)
    ? sumMoney(amounts)
    : null;
}

export function totalDifference(
  values: Pick<BillFormValues, 'installments' | 'totalAmount'>,
): Money | null {
  const sum = installmentsSum(values.installments);
  if (
    sum === null ||
    !hasTotal(values) ||
    !isCanonicalMoney(values.totalAmount)
  ) {
    return null;
  }
  return subtractMoney(values.totalAmount, sum);
}

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

export const billFormValidation = {
  supplierId: required('Fornecedor é obrigatório'),
  documentNumber: required('Número da NF é obrigatório'),
  description: required('Descrição é obrigatória'),
  categoryId: required('Categoria é obrigatória'),
  companyId: required('Empresa é obrigatória'),
  issueDate: required('Data de emissão da NF é obrigatória'),
  totalAmount: (value: string, values: BillFormValues) => {
    if (value.trim() === '') {
      return null;
    }
    const invalid = positiveAmount(value);
    if (invalid) {
      return invalid;
    }
    const difference = totalDifference(values);
    return difference !== null && compareMoney(difference, '0.00') !== 0
      ? `A soma dos boletos difere do valor total em ${formatCurrency(difference.replace('-', ''))}`
      : null;
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
    dueDate: (value: string | null, values: BillFormValues) => {
      if (!value) {
        return 'Vencimento obrigatório';
      }
      return values.issueDate && value < values.issueDate
        ? 'Vencimento anterior à emissão da NF'
        : null;
    },
    amount: positiveAmount,
    digitableLine: (value: string) =>
      value.trim() === '' ? null : boletoReferenceError(value),
    paymentDate: (
      value: string | null,
      values: BillFormValues,
      path: string,
    ) => {
      const index = Number(path.split('.')[1]);
      return values.installments[index]?.paid && !value
        ? 'Informe a data do pagamento'
        : null;
    },
  },
};

const optionalDigitableLine = (value: string) =>
  value.trim() === '' ? undefined : normalizeBoletoReference(value);

function buildFields(values: BillFormValues) {
  const fields = {
    documentNumber: values.documentNumber.trim(),
    description: values.description.trim(),
    issueDate: values.issueDate!,
    companyId: values.companyId!,
    categoryId: values.categoryId!,
    supplierId: values.supplierId!,
  };
  return values.projectId ? { ...fields, projectId: values.projectId } : fields;
}

export function buildInstallmentsPayload(
  values: BillFormValues,
): CreateInstallmentsInput {
  const payload: CreateInstallmentsInput = {
    ...buildFields(values),
    installments: values.installments.map((row) => {
      const installment = {
        label: row.label.trim(),
        dueDate: row.dueDate!,
        amount: row.amount,
      };
      const line = optionalDigitableLine(row.digitableLine);
      return {
        ...installment,
        ...(line ? { digitableLine: line } : {}),
        ...(row.paid && row.paymentDate
          ? { paymentDate: row.paymentDate }
          : {}),
      };
    }),
  };
  return hasTotal(values)
    ? { ...payload, totalAmount: values.totalAmount }
    : payload;
}

export function buildUpdatePayload(values: BillFormValues): UpdateBillInput {
  const [row] = values.installments;
  return {
    ...buildFields(values),
    projectId: values.projectId,
    amount: row.amount,
    dueDate: row.dueDate!,
    digitableLine: optionalDigitableLine(row.digitableLine) ?? null,
  };
}
