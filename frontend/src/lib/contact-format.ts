import { onlyDigits } from './document.ts';

const VALID_AREA_CODES = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

export function phoneError(value: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length !== 10 && digits.length !== 11) {
    return 'Telefone deve ter DDD e 8 ou 9 dígitos';
  }
  if (!VALID_AREA_CODES.has(Number(digits.slice(0, 2)))) {
    return 'Telefone com DDD inválido';
  }
  if (digits.length === 11 && digits[2] !== '9') {
    return 'Celular deve começar com 9 depois do DDD';
  }
  return null;
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export function zipCodeError(value: string): string | null {
  return onlyDigits(value).length === 8 ? null : 'CEP deve ter 8 dígitos';
}

export function formatZipCode(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const digits = onlyDigits(value);
  return digits.length === 8
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : value;
}

export function emailError(value: string): string | null {
  return EMAIL.test(value.trim()) ? null : 'Informe um e-mail válido';
}
