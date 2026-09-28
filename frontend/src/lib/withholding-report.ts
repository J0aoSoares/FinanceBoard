import {
  TAX_TYPES,
  TAX_TYPE_LABELS,
  type TaxType,
  type WithholdingByType,
  type WithholdingCompany,
  type WithholdingProject,
  type WithholdingReport,
} from '../api/types.ts';
import { csvMoney, type CsvCell } from './csv.ts';
import { formatCompetence, formatDate } from './date.ts';
import type { Money } from './money.ts';

const ZERO: Money = '0.00';

export const amountOf = (entries: WithholdingByType[], type: TaxType): Money =>
  entries.find((entry) => entry.type === type)?.amount ?? ZERO;

const typeHeaders = () => TAX_TYPES.map((type) => TAX_TYPE_LABELS[type]);

export function invoiceCsvRows(report: WithholdingReport): CsvCell[][] {
  return [
    [
      'Número',
      'Empresa',
      'CNPJ',
      'Obra',
      'Tomador',
      'Competência',
      'Emissão',
      'Recebimento',
      'Bruto',
      ...typeHeaders(),
      'Total retido',
      'Líquido',
    ],
    ...report.invoices.map((invoice) => [
      invoice.number ?? '',
      invoice.legalName,
      invoice.cnpj,
      invoice.projectName ?? '',
      invoice.clientName,
      formatCompetence(invoice.competence),
      formatDate(invoice.issueDate),
      invoice.receiptDate ? formatDate(invoice.receiptDate) : '',
      csvMoney(invoice.grossAmount),
      ...TAX_TYPES.map((type) => csvMoney(invoice.amountsByType[type])),
      csvMoney(invoice.withholdingTotal),
      csvMoney(invoice.netAmount),
    ]),
    [
      `Total: ${report.totals.invoiceCount} ${report.totals.invoiceCount === 1 ? 'nota' : 'notas'}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      csvMoney(report.totals.grossAmount),
      ...TAX_TYPES.map((type) =>
        csvMoney(amountOf(report.totals.byType, type)),
      ),
      csvMoney(report.totals.total),
      csvMoney(report.totals.netAmount),
    ],
  ];
}

export function companyCsvRows(report: WithholdingReport): CsvCell[][] {
  return summaryRows(
    ['Empresa', 'CNPJ'],
    report.companies,
    (company: WithholdingCompany) => [company.legalName, company.cnpj],
    report,
  );
}

export function projectCsvRows(report: WithholdingReport): CsvCell[][] {
  return summaryRows(
    ['Obra'],
    report.projects,
    (project: WithholdingProject) => [project.name],
    report,
  );
}

function summaryRows<T extends WithholdingCompany | WithholdingProject>(
  labels: string[],
  groups: T[],
  describe: (group: T) => CsvCell[],
  report: WithholdingReport,
): CsvCell[][] {
  return [
    [...labels, 'Notas', ...typeHeaders(), 'Total retido'],
    ...groups.map((group) => [
      ...describe(group),
      group.invoiceCount,
      ...TAX_TYPES.map((type) => csvMoney(amountOf(group.byType, type))),
      csvMoney(group.total),
    ]),
    [
      'Total',
      ...labels.slice(1).map(() => ''),
      report.totals.invoiceCount,
      ...TAX_TYPES.map((type) =>
        csvMoney(amountOf(report.totals.byType, type)),
      ),
      csvMoney(report.totals.total),
    ],
  ];
}

export function legacyCsvRows(report: WithholdingReport): CsvCell[][] {
  const { bills, totals } = report.legacy;
  return [
    [
      'NF',
      'Empresa',
      'CNPJ',
      'Fornecedor',
      'Referência',
      'Bruto',
      ...typeHeaders(),
      'Total retido',
      'Líquido',
    ],
    ...bills.map((bill) => [
      bill.documentNumber,
      bill.legalName,
      bill.cnpj,
      bill.supplierName,
      formatDate(bill.referenceDate),
      csvMoney(bill.grossAmount),
      ...TAX_TYPES.map((type) => csvMoney(bill.amountsByType[type])),
      csvMoney(bill.withholdingTotal),
      csvMoney(bill.netAmount),
    ]),
    [
      `Total: ${totals.billCount} ${totals.billCount === 1 ? 'boleto' : 'boletos'} (modelo anterior)`,
      '',
      '',
      '',
      '',
      '',
      ...TAX_TYPES.map((type) => csvMoney(amountOf(totals.byType, type))),
      csvMoney(totals.total),
      '',
    ],
  ];
}
