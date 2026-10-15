export type DocumentNumber = string;

const CNPJ = /^\d{14}$/;
const CPF = /^\d{11}$/;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isCnpj(value: string): boolean {
  return CNPJ.test(value);
}

export function isCpf(value: string): boolean {
  return CPF.test(value);
}

export function isDocument(value: string): boolean {
  return isCpf(value) || isCnpj(value);
}

export function formatCnpj(value: string): string {
  if (!isCnpj(value)) {
    return value;
  }
  const parts = [
    value.slice(0, 2),
    value.slice(2, 5),
    value.slice(5, 8),
    value.slice(8, 12),
    value.slice(12),
  ];
  return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}-${parts[4]}`;
}

export function formatCpf(value: string): string {
  if (!isCpf(value)) {
    return value;
  }
  const parts = [
    value.slice(0, 3),
    value.slice(3, 6),
    value.slice(6, 9),
    value.slice(9),
  ];
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
}

export function formatDocument(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  if (isCnpj(value)) {
    return formatCnpj(value);
  }
  if (isCpf(value)) {
    return formatCpf(value);
  }
  return value;
}

export function documentKind(value: string): 'CPF' | 'CNPJ' | null {
  if (isCpf(value)) {
    return 'CPF';
  }
  if (isCnpj(value)) {
    return 'CNPJ';
  }
  return null;
}

export type PersonType = 'COMPANY' | 'INDIVIDUAL';

const allSameDigit = (digits: string) => /^(\d)\1+$/.test(digits);

function checkDigit(digits: string, weights: number[]) {
  const sum = weights.reduce(
    (acc, weight, index) => acc + Number(digits[index]) * weight,
    0,
  );
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || allSameDigit(digits)) {
    return false;
  }
  return (
    checkDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(digits[9]) &&
    checkDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(digits[10])
  );
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || allSameDigit(digits)) {
    return false;
  }
  return (
    checkDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(digits[12]) &&
    checkDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(digits[13])
  );
}

export function documentError(
  value: string,
  personType: PersonType,
): string | null {
  const digits = onlyDigits(value);
  if (personType === 'COMPANY') {
    if (digits.length !== 14) {
      return 'CNPJ deve ter 14 dígitos';
    }
    return isValidCnpj(digits)
      ? null
      : 'CNPJ inválido: dígitos verificadores não conferem';
  }
  if (digits.length !== 11) {
    return 'CPF deve ter 11 dígitos';
  }
  return isValidCpf(digits)
    ? null
    : 'CPF inválido: dígitos verificadores não conferem';
}
