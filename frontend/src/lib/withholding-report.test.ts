import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WithholdingReport } from '../api/types.ts';
import { toCsv } from './csv.ts';
import {
  companyCsvRows,
  invoiceCsvRows,
  legacyCsvRows,
  projectCsvRows,
} from './withholding-report.ts';

const report: WithholdingReport = {
  regime: 'accrual',
  from: '2026-06',
  to: '2026-09',
  consolidated: true,
  companies: [
    {
      companyId: 'a',
      legalName: 'Terraplenagem; Teste LTDA',
      cnpj: '11111111000191',
      invoiceCount: 1,
      total: '1600.00',
      byType: [
        { type: 'INSS', amount: '1100.00' },
        { type: 'ISS', amount: '500.00' },
      ],
    },
  ],
  projects: [
    {
      projectId: 'p',
      name: 'Obra Beta',
      invoiceCount: 1,
      total: '1600.00',
      byType: [
        { type: 'INSS', amount: '1100.00' },
        { type: 'ISS', amount: '500.00' },
      ],
    },
  ],
  invoices: [
    {
      id: 'n1',
      number: 'NFS-002',
      companyId: 'a',
      legalName: 'Terraplenagem; Teste LTDA',
      cnpj: '11111111000191',
      projectId: 'p',
      projectName: 'Obra Beta',
      clientName: 'Cliente "Beta"',
      competence: '2026-07-01T00:00:00.000Z',
      issueDate: '2026-07-05T00:00:00.000Z',
      receiptDate: null,
      grossAmount: '10000.00',
      withholdingTotal: '1600.00',
      netAmount: '8400.00',
      amountsByType: {
        INSS: '1100.00',
        ISS: '500.00',
        IRRF: '0.00',
        PIS_COFINS_CSLL: '0.00',
      },
    },
  ],
  totals: {
    invoiceCount: 1,
    total: '1600.00',
    grossAmount: '10000.00',
    netAmount: '8400.00',
    byType: [
      { type: 'INSS', amount: '1100.00' },
      { type: 'ISS', amount: '500.00' },
    ],
  },
  legacy: {
    bills: [
      {
        id: 'b1',
        documentNumber: 'NF-ANTIGA',
        companyId: 'a',
        legalName: 'Terraplenagem; Teste LTDA',
        cnpj: '11111111000191',
        supplierName: 'Oficina',
        referenceDate: '2026-07-10T00:00:00.000Z',
        grossAmount: '2500.00',
        withholdingTotal: '250.00',
        netAmount: '2250.00',
        amountsByType: {
          INSS: '250.00',
          ISS: '0.00',
          IRRF: '0.00',
          PIS_COFINS_CSLL: '0.00',
        },
      },
    ],
    totals: {
      billCount: 1,
      total: '250.00',
      byType: [{ type: 'INSS', amount: '250.00' }],
    },
  },
};

describe('CSV do relatório de retenções sofridas', () => {
  it('tem uma coluna por tipo de retenção, com vírgula decimal', () => {
    const [header, row, total] = invoiceCsvRows(report);
    assert.deepEqual(header, [
      'Número',
      'Empresa',
      'CNPJ',
      'Obra',
      'Tomador',
      'Competência',
      'Emissão',
      'Recebimento',
      'Bruto',
      'INSS',
      'ISS',
      'IRRF',
      'PIS/COFINS/CSLL',
      'Total retido',
      'Líquido',
    ]);
    assert.deepEqual(row.slice(5), [
      '07/2026',
      '05/07/2026',
      '',
      '10000,00',
      '1100,00',
      '500,00',
      '0,00',
      '0,00',
      '1600,00',
      '8400,00',
    ]);
    assert.equal(total[0], 'Total: 1 NF');
    assert.equal(total.length, header.length);
  });

  it('escapa ponto e vírgula e aspas nas células', () => {
    const csv = toCsv(invoiceCsvRows(report));
    assert.ok(csv.includes('"Terraplenagem; Teste LTDA"'));
    assert.ok(csv.includes('"Cliente ""Beta"""'));
  });

  it('resume por empresa e por obra com o total geral no fim', () => {
    const companies = companyCsvRows(report);
    assert.deepEqual(companies[0].slice(0, 3), ['Empresa', 'CNPJ', 'NFs']);
    assert.deepEqual(companies[companies.length - 1], [
      'Total',
      '',
      1,
      '1100,00',
      '500,00',
      '0,00',
      '0,00',
      '1600,00',
    ]);

    const projects = projectCsvRows(report);
    assert.deepEqual(projects[1], [
      'Obra Beta',
      1,
      '1100,00',
      '500,00',
      '0,00',
      '0,00',
      '1600,00',
    ]);
  });

  it('exporta o histórico dos boletos antigos separado', () => {
    const rows = legacyCsvRows(report);
    assert.equal(rows[1][0], 'NF-ANTIGA');
    assert.equal(rows[2][0], 'Total: 1 boleto (modelo anterior)');
    assert.equal(rows[2].length, rows[0].length);
  });
});
