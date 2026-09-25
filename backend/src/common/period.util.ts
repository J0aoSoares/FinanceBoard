export function startOfTodayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

import { BadRequestException } from '@nestjs/common';

export const MAX_REPORT_MONTHS = 36;

export function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthsBetween(from: string, to: string) {
  const months: string[] = [];
  const cursor = monthRange(from).start;
  const last = monthRange(to).start;

  while (cursor <= last) {
    months.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function resolveReportMonths(from: string, to: string) {
  if (monthRange(from).start > monthRange(to).start) {
    throw new BadRequestException(
      'Mês inicial não pode ser posterior ao mês final',
    );
  }
  const months = monthsBetween(from, to);
  if (months.length > MAX_REPORT_MONTHS) {
    throw new BadRequestException(
      `O período do relatório não pode exceder ${MAX_REPORT_MONTHS} meses`,
    );
  }
  return months;
}
