import {
  buildMonth,
  currentMonth,
  currentYear,
  monthNumberOf,
  shiftMonth,
  yearOf,
  type Month,
} from './date';

export const MAX_REPORT_MONTHS = 36;

export function monthsInclusive(from: Month, to: Month): Month[] {
  const months: Month[] = [];
  let cursor = from;
  while (cursor <= to) {
    months.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return months;
}

export function countMonths(from: Month, to: Month): number {
  return (
    (yearOf(to) - yearOf(from)) * 12 +
    monthNumberOf(to) -
    monthNumberOf(from) +
    1
  );
}

export function validateReportPeriod(
  from: Month | null,
  to: Month | null,
): string | null {
  if (!from) {
    return 'Informe o mês inicial';
  }
  if (!to) {
    return 'Informe o mês final';
  }
  if (from > to) {
    return 'Mês inicial não pode ser posterior ao mês final';
  }
  if (countMonths(from, to) > MAX_REPORT_MONTHS) {
    return `O período do relatório não pode exceder ${MAX_REPORT_MONTHS} meses`;
  }
  return null;
}

export interface PeriodPreset {
  id: string;
  label: string;
  build: () => { from: Month; to: Month };
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  {
    id: 'current-month',
    label: 'Mês atual',
    build: () => ({ from: currentMonth(), to: currentMonth() }),
  },
  {
    id: 'last-3',
    label: 'Últimos 3 meses',
    build: () => ({ from: shiftMonth(currentMonth(), -2), to: currentMonth() }),
  },
  {
    id: 'last-12',
    label: 'Últimos 12 meses',
    build: () => ({
      from: shiftMonth(currentMonth(), -11),
      to: currentMonth(),
    }),
  },
  {
    id: 'current-year',
    label: 'Ano corrente',
    build: () => ({
      from: buildMonth(currentYear(), 1),
      to: buildMonth(currentYear(), 12),
    }),
  },
];
