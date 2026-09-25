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
