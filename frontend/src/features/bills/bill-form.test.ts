import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  billFormValidation,
  buildInstallmentsPayload,
  buildNfUpdatePayload,
  buildUpdatePayload,
  emptyBillForm,
  generateRows,
  nextRow,
  totalDifference,
  type BillFormValues,
  nfLabel,
} from './bill-form.ts';

const filled = (overrides: Partial<BillFormValues> = {}): BillFormValues => ({
  ...emptyBillForm('company'),
  supplierId: 'supplier',
  documentNumber: ' NF-555 ',
  description: ' Cimento ',
  categoryId: 'category',
  issueDate: '2026-01-10',
  ...overrides,
});

describe('formulário da NF de boletos', () => {
  it('mostra o prefixo NF só quando o número não começa com ele', () => {
    assert.equal(nfLabel('1088'), 'NF 1088');
    assert.equal(nfLabel('NF-1088'), 'NF-1088');
    assert.equal(nfLabel('nf 77'), 'nf 77');
  });

  it('começa com um boleto, rotulado 1', () => {
    const values = emptyBillForm();
    assert.equal(values.installments.length, 1);
    assert.equal(values.installments[0].label, '1');
  });

  it('gera os boletos dividindo o total e caindo no último dia do mês', () => {
    const rows = generateRows(
      {
        labelPattern: 'alpha',
        totalAmount: '1000.00',
        generator: { count: 3, firstDueDate: '2026-01-31', intervalMonths: 1 },
      },
      [],
    );
    assert.deepEqual(
      rows.map((row) => `${row.label} ${row.dueDate} ${row.amount}`),
      ['A 2026-01-31 333.34', 'B 2026-02-28 333.33', 'C 2026-03-31 333.33'],
    );
  });

  it('sem total, gera as linhas e mantém os valores já digitados', () => {
    const rows = generateRows(
      {
        labelPattern: 'numeric',
        totalAmount: '',
        generator: { count: 2, firstDueDate: '2026-02-10', intervalMonths: 2 },
      },
      [{ label: 'x', dueDate: null, amount: '50.00', digitableLine: '' }],
    );
    assert.deepEqual(
      rows.map((row) => `${row.label} ${row.dueDate} ${row.amount}`),
      ['1 2026-02-10 50.00', '2 2026-04-10 '],
    );
  });

  it('adiciona a próxima linha com o rótulo seguinte e o mês seguinte', () => {
    const values = filled({
      labelPattern: 'alpha',
      installments: [
        {
          label: 'A',
          dueDate: '2026-01-31',
          amount: '10.00',
          digitableLine: '',
        },
      ],
    });
    assert.deepEqual(nextRow(values), {
      label: 'B',
      dueDate: '2026-02-28',
      amount: '',
      digitableLine: '',
      paid: false,
      paymentDate: null,
    });
  });

  it('só compara com o total quando ele foi informado', () => {
    const rows = [
      {
        label: '1',
        dueDate: '2026-02-10',
        amount: '600.00',
        digitableLine: '',
      },
      {
        label: '2',
        dueDate: '2026-03-10',
        amount: '300.00',
        digitableLine: '',
      },
    ];
    assert.equal(
      totalDifference({ installments: rows, totalAmount: '' }),
      null,
    );
    assert.equal(
      totalDifference({ installments: rows, totalAmount: '1000.00' }),
      '100.00',
    );
  });

  it('monta a NF sem total e com a linha digitável só em dígitos', () => {
    const payload = buildInstallmentsPayload(
      filled({
        installments: [
          {
            label: ' 1 ',
            dueDate: '2026-02-10',
            amount: '120.00',
            digitableLine:
              '00190.00009 01234.567897 01234.567897 7 15510000560000',
          },
          {
            label: '2',
            dueDate: '2026-03-10',
            amount: '80.55',
            digitableLine: '',
          },
        ],
      }),
    );
    assert.deepEqual(payload, {
      documentNumber: 'NF-555',
      description: 'Cimento',
      issueDate: '2026-01-10',
      companyId: 'company',
      categoryId: 'category',
      supplierId: 'supplier',
      installments: [
        {
          label: '1',
          dueDate: '2026-02-10',
          amount: '120.00',
          digitableLine: '00190000090123456789701234567897715510000560000',
        },
        { label: '2', dueDate: '2026-03-10', amount: '80.55' },
      ],
    });
  });

  it('aceita número do documento livre e envia a data só dos boletos pagos', () => {
    const payload = buildInstallmentsPayload(
      filled({
        installments: [
          {
            label: '1',
            dueDate: '2026-02-10',
            amount: '120.00',
            digitableLine: ' 1909223 ',
            paid: true,
            paymentDate: '2026-02-09',
          },
          {
            label: '2',
            dueDate: '2026-03-10',
            amount: '80.55',
            digitableLine: '',
            paid: false,
            paymentDate: '2026-03-01',
          },
        ],
      }),
    );
    assert.deepEqual(payload.installments, [
      {
        label: '1',
        dueDate: '2026-02-10',
        amount: '120.00',
        digitableLine: '1909223',
        paymentDate: '2026-02-09',
      },
      { label: '2', dueDate: '2026-03-10', amount: '80.55' },
    ]);
  });

  it('exige a data do pagamento só quando o boleto está marcado como pago', () => {
    const validate = billFormValidation.installments.paymentDate;
    const values = filled({
      installments: [
        {
          label: '1',
          dueDate: '2026-02-10',
          amount: '10.00',
          digitableLine: '',
          paid: true,
          paymentDate: null,
        },
        {
          label: '2',
          dueDate: '2026-03-10',
          amount: '10.00',
          digitableLine: '',
          paid: false,
          paymentDate: null,
        },
      ],
    });
    assert.equal(
      validate(null, values, 'installments.0.paymentDate'),
      'Informe a data do pagamento',
    );
    assert.equal(validate(null, values, 'installments.1.paymentDate'), null);
  });

  it('cadastra boletos sem NF: número e emissão ficam de fora', () => {
    const values = filled({ documentNumber: '  ', issueDate: null });
    assert.equal('documentNumber' in billFormValidation, false);
    const payload = buildInstallmentsPayload(values);
    assert.equal('documentNumber' in payload, false);
    assert.equal('issueDate' in payload, false);
    assert.equal(nfLabel(null), 'Sem NF');
    assert.equal(nfLabel(' '), 'Sem NF');
  });

  it('ao editar, NF em branco é enviada como null para limpar', () => {
    const payload = buildUpdatePayload(
      filled({ documentNumber: '', issueDate: null }),
    );
    assert.equal(payload.documentNumber, null);
    assert.equal(payload.issueDate, null);
  });

  it('boleto pago envia só os dados da NF', () => {
    assert.deepEqual(buildNfUpdatePayload(filled()), {
      documentNumber: 'NF-555',
      issueDate: '2026-01-10',
    });
  });

  it('envia o total e a obra quando informados', () => {
    const payload = buildInstallmentsPayload(
      filled({ totalAmount: '200.55', projectId: 'project' }),
    );
    assert.equal(payload.totalAmount, '200.55');
    assert.equal(payload.projectId, 'project');
  });

  it('edição de um boleto envia os dados da NF e da linha dele', () => {
    const payload = buildUpdatePayload(
      filled({
        installments: [
          {
            label: 'B',
            dueDate: '2026-02-10',
            amount: '99.90',
            digitableLine: '',
          },
        ],
      }),
    );
    assert.deepEqual(payload, {
      documentNumber: 'NF-555',
      description: 'Cimento',
      issueDate: '2026-01-10',
      companyId: 'company',
      categoryId: 'category',
      supplierId: 'supplier',
      projectId: null,
      amount: '99.90',
      dueDate: '2026-02-10',
      digitableLine: null,
    });
  });
});
