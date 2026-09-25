export type Money = string;

const CANONICAL = /^\d+(\.\d{1,2})?$/;

export function isCanonicalMoney(value: string): boolean {
  return CANONICAL.test(value);
}

export function toCents(value: Money): number {
  if (!isCanonicalMoney(value)) {
    throw new Error(`Valor monetário fora do formato canônico: ${value}`);
  }
  const [whole, fraction = ''] = value.split('.');
  return Number(`${whole}${fraction.padEnd(2, '0')}`);
}

export function toSignedCents(value: Money): number {
  return value.startsWith('-') ? -toCents(value.slice(1)) : toCents(value);
}

export function fromCents(cents: number): Money {
  const negative = cents < 0;
  const absolute = Math.abs(Math.trunc(cents)).toString().padStart(3, '0');
  const whole = absolute.slice(0, -2);
  const fraction = absolute.slice(-2);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function sumMoney(values: Money[]): Money {
  return fromCents(values.reduce((total, value) => total + toCents(value), 0));
}

export function subtractMoney(minuend: Money, subtrahend: Money): Money {
  return fromCents(toCents(minuend) - toCents(subtrahend));
}

export function splitMoney(total: Money, parts: number): Money[] {
  if (parts <= 0) {
    return [];
  }
  const cents = toCents(total);
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  return Array.from({ length: parts }, (_, index) =>
    fromCents(index === 0 ? base + remainder : base),
  );
}

export function netOfDeductions(
  gross: Money,
  deductions: Money[],
): Money | null {
  if (!isCanonicalMoney(gross) || !deductions.every(isCanonicalMoney)) {
    return null;
  }
  const net = toCents(gross) - toCents(sumMoney(deductions));
  return net > 0 ? fromCents(net) : null;
}

export function compareMoney(left: Money, right: Money): number {
  return toCents(left) - toCents(right);
}

export function parseMoneyInput(raw: string): Money | null {
  const digitsOnly = raw.replace(/[^\d,.-]/g, '').trim();
  if (digitsOnly === '' || digitsOnly.includes('-')) {
    return null;
  }

  const lastComma = digitsOnly.lastIndexOf(',');
  const lastDot = digitsOnly.lastIndexOf('.');
  const separator = Math.max(lastComma, lastDot);

  let whole: string;
  let fraction: string;

  if (separator === -1) {
    whole = digitsOnly;
    fraction = '';
  } else {
    whole = digitsOnly.slice(0, separator);
    fraction = digitsOnly.slice(separator + 1);
    if (!/^\d{1,2}$/.test(fraction)) {
      whole = digitsOnly;
      fraction = '';
    }
  }

  whole = whole.replace(/\D/g, '');
  if (whole === '' && fraction === '') {
    return null;
  }

  const canonical = `${whole === '' ? '0' : whole}${fraction === '' ? '' : `.${fraction}`}`;
  return isCanonicalMoney(canonical) ? canonical : null;
}

const groupFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

export function formatMoney(value: Money | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const negative = value.startsWith('-');
  const absolute = negative ? value.slice(1) : value;
  if (!isCanonicalMoney(absolute)) {
    return value;
  }

  const [whole, fraction = ''] = absolute.split('.');
  const grouped = groupFormatter.format(BigInt(whole));
  return `${negative ? '-' : ''}${grouped},${fraction.padEnd(2, '0')}`;
}

export function formatCurrency(value: Money | null | undefined): string {
  const formatted = formatMoney(value);
  return formatted === '—' ? formatted : `R$ ${formatted}`;
}
