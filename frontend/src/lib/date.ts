import dayjs from 'dayjs';
import 'dayjs/locale/pt-br.js';

dayjs.locale('pt-br');

export type IsoDate = string;
export type Month = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
}

export function isMonth(value: string): boolean {
  return MONTH.test(value);
}

export function apiDate(timestamp: string | null | undefined): IsoDate | null {
  if (!timestamp) {
    return null;
  }
  const sliced = timestamp.slice(0, 10);
  return isIsoDate(sliced) ? sliced : null;
}

export function formatDate(timestamp: string | null | undefined): string {
  const date = apiDate(timestamp);
  if (!date) {
    return '—';
  }
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function todayIsoDate(): IsoDate {
  return dayjs().format('YYYY-MM-DD');
}

export function currentMonth(): Month {
  return dayjs().format('YYYY-MM');
}

export function monthOf(date: IsoDate): Month {
  return date.slice(0, 7);
}

export function monthToPickerValue(month: Month): IsoDate {
  return `${month}-01`;
}

export function pickerValueToMonth(value: IsoDate): Month {
  return value.slice(0, 7);
}

export function formatMonth(month: Month): string {
  return dayjs(monthToPickerValue(month)).format('MMMM [de] YYYY');
}

export function yearOf(month: Month): number {
  return Number(month.slice(0, 4));
}

export function monthNumberOf(month: Month): number {
  return Number(month.slice(5, 7));
}

export function buildMonth(year: number, monthNumber: number): Month {
  return `${year}-${String(monthNumber).padStart(2, '0')}`;
}

export function withYear(month: Month, year: number): Month {
  return buildMonth(year, monthNumberOf(month));
}

export function currentYear(): number {
  return yearOf(currentMonth());
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export function shortMonthLabels(): string[] {
  return Array.from({ length: 12 }, (_, index) =>
    capitalize(dayjs().month(index).format('MMM')),
  );
}

export function shiftMonth(month: Month, amount: number): Month {
  return dayjs(monthToPickerValue(month))
    .add(amount, 'month')
    .format('YYYY-MM');
}

export function isBeforeDate(left: IsoDate, right: IsoDate): boolean {
  return left < right;
}

const TYPED_DATE_WITH_SLASHES = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;
const TYPED_DATE_DIGITS = /^(\d{2})(\d{2})(\d{2}|\d{4})$/;
const FORMATTED_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
const MIN_TYPED_YEAR = 1900;
const MAX_TYPED_YEAR = 2099;
const TWO_DIGIT_YEAR_BASE = 2000;

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

function daysInMonth(year: number, monthNumber: number): number {
  if (monthNumber === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(monthNumber) ? 30 : 31;
}

export function parseTypedDate(text: string): IsoDate | null {
  const trimmed = text.trim();
  const match =
    TYPED_DATE_WITH_SLASHES.exec(trimmed) ?? TYPED_DATE_DIGITS.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const monthNumber = Number(monthText);
  const year =
    yearText.length === 2
      ? TWO_DIGIT_YEAR_BASE + Number(yearText)
      : Number(yearText);

  if (
    year < MIN_TYPED_YEAR ||
    year > MAX_TYPED_YEAR ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    day < 1 ||
    day > daysInMonth(year, monthNumber)
  ) {
    return null;
  }

  return `${buildMonth(year, monthNumber)}-${String(day).padStart(2, '0')}`;
}

export function addMonthsClamped(date: IsoDate, months: number): IsoDate {
  const [year, monthNumber, day] = date.split('-').map(Number);
  const index = year * 12 + (monthNumber - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${buildMonth(targetYear, targetMonth)}-${String(targetDay).padStart(2, '0')}`;
}

export function monthlyDueDates(
  firstDueDate: IsoDate,
  count: number,
  intervalMonths: number,
): IsoDate[] {
  return Array.from({ length: count }, (_, index) =>
    addMonthsClamped(firstDueDate, index * intervalMonths),
  );
}

export function parseFormattedDate(text: string): IsoDate | null {
  return FORMATTED_DATE.test(text.trim()) ? parseTypedDate(text) : null;
}
