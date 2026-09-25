import type { Money } from './money';
import type { Regime } from '../api/types';

const SEPARATOR = ';';
const BOM = '\uFEFF';

export type CsvCell = string | number;

export function csvMoney(value: Money): string {
  return value.replace('.', ',');
}

function escapeCell(cell: CsvCell): string {
  const text = String(cell);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(SEPARATOR)).join('\r\n');
}

export function reportFileName(
  report: string,
  from: string,
  to: string,
  regime: Regime,
): string {
  const period = from === to ? from : `${from}_${to}`;
  const regimeLabel = regime === 'cash' ? 'caixa' : 'competencia';
  return `${report}_${period}_${regimeLabel}.csv`;
}

export function downloadCsv(fileName: string, rows: CsvCell[][]): void {
  const blob = new Blob([BOM, toCsv(rows)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
