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

const VALID_AREA_CODES = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

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
  const first = checkDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(digits[9]) && second === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || allSameDigit(digits)) {
    return false;
  }
  const first = checkDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(digits[12]) && second === Number(digits[13]);
}

export function documentError(
  value: string,
  personType: 'COMPANY' | 'INDIVIDUAL',
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

export function zipCodeError(value: string): string | null {
  return onlyDigits(value).length === 8 ? null : 'CEP deve ter 8 dígitos';
}
