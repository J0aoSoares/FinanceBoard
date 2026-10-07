import {
  PROJECT_BILLING_STATUS_LABELS,
  type CreateProjectBillingInput,
  type ProjectBilling,
  type UpdateProjectBillingInput,
} from '../../api/types.ts';
import { csvMoney, type CsvCell } from '../../lib/csv.ts';
import { apiDate, formatDate, todayIsoDate } from '../../lib/date.ts';
import {
  compareMoney,
  isCanonicalMoney,
  isPercent,
  percentOf,
  subtractMoney,
  type Money,
} from '../../lib/money.ts';

export type RetainageMode = 'percent' | 'amount';

export interface ProjectBillingFormValues {
  number: string;
  companyId: string | null;
  projectId: string | null;
  newProjectClientName: string;
  amount: Money;
  retainageMode: RetainageMode;
  retainage: string;
  dueDate: string | null;
  paid: boolean;
  paymentDate: string | null;
  bankId: string | null;
}

export const emptyProjectBillingForm = (
  companyId?: string,
  projectId?: string,
): ProjectBillingFormValues => ({
  number: '',
  companyId: companyId ?? null,
  projectId: projectId ?? null,
  newProjectClientName: '',
  amount: '',
  retainageMode: 'percent',
  retainage: '',
  dueDate: null,
  paid: false,
  paymentDate: null,
  bankId: null,
});

const trimPercent = (percent: string) =>
  percent.replace(/\.?0+$/, '').replace('.', ',');

export const projectBillingToFormValues = (
  billing: ProjectBilling,
): ProjectBillingFormValues => ({
  ...emptyProjectBillingForm(billing.companyId, billing.projectId),
  number: billing.number,
  amount: billing.amount,
  retainageMode: billing.retainagePercent ? 'percent' : 'amount',
  retainage: billing.retainagePercent
    ? trimPercent(billing.retainagePercent)
    : compareMoney(billing.retainageAmount, '0.00') === 0
      ? ''
      : billing.retainageAmount,
  dueDate: apiDate(billing.dueDate),
});

export const projectBillingLabel = (billing: ProjectBilling) =>
  `fatura ${billing.number}`;

export const normalizePercent = (value: string) =>
  value.trim().replace(',', '.');

export function previewRetainage(
  values: Pick<
    ProjectBillingFormValues,
    'amount' | 'retainage' | 'retainageMode'
  >,
): Money | null {
  if (!isCanonicalMoney(values.amount)) {
    return null;
  }
  const raw = values.retainage.trim();
  if (raw === '') {
    return '0.00';
  }
  if (values.retainageMode === 'percent') {
    return percentOf(values.amount, normalizePercent(raw));
  }
  return isCanonicalMoney(raw) ? raw : null;
}

export function previewNet(
  values: Pick<
    ProjectBillingFormValues,
    'amount' | 'retainage' | 'retainageMode'
  >,
): Money | null {
  const retainage = previewRetainage(values);
  if (retainage === null || compareMoney(retainage, values.amount) >= 0) {
    return null;
  }
  return subtractMoney(values.amount, retainage);
}

const required = (message: string) => (value: string | null) =>
  value && value.trim() !== '' ? null : message;

export const projectBillingFormValidation = {
  number: required('Número da fatura é obrigatório'),
  companyId: required('Empresa emissora é obrigatória'),
  projectId: required('Obra é obrigatória'),
  dueDate: required('Data de vencimento é obrigatória'),
  amount: (value: string) => {
    if (!isCanonicalMoney(value)) {
      return 'Informe um valor válido';
    }
    return compareMoney(value, '0.00') <= 0
      ? 'O valor deve ser maior que zero'
      : null;
  },
  retainage: (value: string, values: ProjectBillingFormValues) => {
    const raw = value.trim();
    if (raw === '') {
      return null;
    }
    if (
      values.retainageMode === 'percent' &&
      !isPercent(normalizePercent(raw))
    ) {
      return 'Informe um percentual menor que 100, com até 2 casas';
    }
    if (values.retainageMode === 'amount' && !isCanonicalMoney(raw)) {
      return 'Informe um valor válido';
    }
    const retainage = previewRetainage(values);
    return retainage !== null &&
      isCanonicalMoney(values.amount) &&
      compareMoney(retainage, values.amount) >= 0
      ? 'Caução deve ser menor que o valor da fatura'
      : null;
  },
  paymentDate: (value: string | null, values: ProjectBillingFormValues) => {
    if (!values.paid) {
      return null;
    }
    if (!value) {
      return 'Informe a data do pagamento junto com o banco';
    }
    return value > todayIsoDate()
      ? 'Data de pagamento não pode ser futura'
      : null;
  },
  bankId: (value: string | null, values: ProjectBillingFormValues) =>
    values.paid && !value
      ? 'Informe o banco junto com a data do pagamento'
      : null,
};

function retainageFields(values: ProjectBillingFormValues, editing: boolean) {
  const raw = values.retainage.trim();
  if (raw === '') {
    return editing ? { retainageAmount: '0.00' } : {};
  }
  return values.retainageMode === 'percent'
    ? { retainagePercent: normalizePercent(raw) }
    : { retainageAmount: raw };
}

export function buildCreatePayload(
  values: ProjectBillingFormValues,
): CreateProjectBillingInput {
  return {
    number: values.number.trim(),
    companyId: values.companyId!,
    projectId: values.projectId!,
    amount: values.amount,
    dueDate: values.dueDate!,
    ...retainageFields(values, false),
    ...(values.paid && values.paymentDate && values.bankId
      ? { paymentDate: values.paymentDate, bankId: values.bankId }
      : {}),
  };
}

export function buildUpdatePayload(
  values: ProjectBillingFormValues,
  amountLocked: boolean,
): UpdateProjectBillingInput {
  const fields = {
    number: values.number.trim(),
    companyId: values.companyId!,
    projectId: values.projectId!,
    dueDate: values.dueDate!,
  };
  return amountLocked
    ? fields
    : { ...fields, amount: values.amount, ...retainageFields(values, true) };
}

export const projectCreationBlockedReason = (clientName: string) =>
  clientName.trim() === ''
    ? 'Preencha o cliente da obra antes de cadastrá-la'
    : null;

export function projectBillingsCsvRows(
  billings: ProjectBilling[],
): CsvCell[][] {
  return [
    [
      'Número',
      'Obra',
      'Cliente',
      'Empresa',
      'Vencimento',
      'Valor',
      'Caução',
      'Líquido',
      'Pagamento',
      'Banco',
      'Situação',
    ],
    ...billings.map((billing) => [
      billing.number,
      billing.project.name,
      billing.project.clientName,
      billing.company.legalName,
      formatDate(billing.dueDate),
      csvMoney(billing.amount),
      csvMoney(billing.retainageAmount),
      csvMoney(billing.netAmount),
      billing.paymentDate ? formatDate(billing.paymentDate) : '',
      billing.bank?.name ?? '',
      PROJECT_BILLING_STATUS_LABELS[billing.effectiveStatus],
    ]),
  ];
}
