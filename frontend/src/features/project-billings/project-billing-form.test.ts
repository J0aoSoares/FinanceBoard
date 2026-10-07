import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { percentOf } from '../../lib/money.ts';
import { todayIsoDate } from '../../lib/date.ts';
import {
  buildCreatePayload,
  buildUpdatePayload,
  emptyProjectBillingForm,
  previewNet,
  previewRetainage,
  projectBillingFormValidation,
  projectBillingToFormValues,
  projectBillingsCsvRows,
  type ProjectBillingFormValues,
} from './project-billing-form.ts';
import type { ProjectBilling } from '../../api/types';

const filled = (
  overrides: Partial<ProjectBillingFormValues> = {},
): ProjectBillingFormValues => ({
  ...emptyProjectBillingForm('company', 'project'),
  number: ' FAT-10 ',
  amount: '10000.00',
  dueDate: '2026-06-15',
  ...overrides,
});

const billing = (overrides: Partial<ProjectBilling> = {}): ProjectBilling =>
  ({
    id: 'b1',
    number: 'FAT-10',
    amount: '10000.00',
    retainageAmount: '500.00',
    retainagePercent: '5.00',
    netAmount: '9500.00',
    dueDate: '2026-06-15T00:00:00.000Z',
    paymentDate: null,
    companyId: 'company',
    projectId: 'project',
    bankId: null,
    company: { id: 'company', legalName: 'Empresa; Teste', cnpj: '1' },
    project: {
      id: 'project',
      name: 'Obra Alfa',
      clientName: 'Cliente Alfa',
      status: 'ACTIVE',
    },
    bank: null,
    effectiveStatus: 'OVERDUE',
    ...overrides,
  }) as ProjectBilling;

describe('caução por percentual em centavos', () => {
  it('arredonda para o centavo mais próximo, meio para cima', () => {
    assert.equal(percentOf('10.10', '5'), '0.51');
    assert.equal(percentOf('333.33', '7.5'), '25.00');
    assert.equal(percentOf('1000.05', '2.5'), '25.00');
    assert.equal(percentOf('1234.56', '10'), '123.46');
    assert.equal(percentOf('99.99', '0.01'), '0.01');
    assert.equal(percentOf('9999999999.99', '99.99'), '9998999999.99');
  });

  it('recusa formatos inválidos', () => {
    assert.equal(percentOf('10.10', '100'), null);
    assert.equal(percentOf('10.10', '5,5'), null);
    assert.equal(percentOf('abc', '5'), null);
  });
});

describe('formulário da fatura', () => {
  it('mostra caução e líquido calculados pelo percentual com vírgula', () => {
    const values = filled({ retainage: '2,5' });
    assert.equal(previewRetainage(values), '250.00');
    assert.equal(previewNet(values), '9750.00');
  });

  it('recusa caução maior ou igual ao valor', () => {
    const values = filled({ retainageMode: 'amount', retainage: '10000.00' });
    assert.equal(
      projectBillingFormValidation.retainage(values.retainage, values),
      'Caução deve ser menor que o valor da fatura',
    );
    assert.equal(previewNet(values), null);
  });

  it('exige data e banco juntos e recusa data futura', () => {
    const paid = filled({ paid: true });
    assert.equal(
      projectBillingFormValidation.paymentDate(null, paid),
      'Informe a data do pagamento junto com o banco',
    );
    assert.equal(
      projectBillingFormValidation.bankId(null, paid),
      'Informe o banco junto com a data do pagamento',
    );
    assert.equal(
      projectBillingFormValidation.paymentDate('2999-01-01', paid),
      'Data de pagamento não pode ser futura',
    );
    assert.equal(
      projectBillingFormValidation.paymentDate(todayIsoDate(), paid),
      null,
    );
    assert.equal(projectBillingFormValidation.bankId(null, filled()), null);
  });

  it('monta o cadastro com percentual e pagamento só quando marcado', () => {
    assert.deepEqual(
      buildCreatePayload(
        filled({
          retainage: '5',
          paid: true,
          paymentDate: '2026-06-20',
          bankId: 'bank',
        }),
      ),
      {
        number: 'FAT-10',
        companyId: 'company',
        projectId: 'project',
        amount: '10000.00',
        dueDate: '2026-06-15',
        retainagePercent: '5',
        paymentDate: '2026-06-20',
        bankId: 'bank',
      },
    );
    const unpaid = buildCreatePayload(
      filled({ paymentDate: '2026-06-20', bankId: 'bank' }),
    );
    assert.equal('paymentDate' in unpaid, false);
    assert.equal('retainageAmount' in unpaid, false);
  });

  it('na edição, limpa a caução com zero e não envia valor de fatura paga', () => {
    assert.equal(buildUpdatePayload(filled(), false).retainageAmount, '0.00');
    const locked = buildUpdatePayload(filled({ retainage: '5' }), true);
    assert.equal('amount' in locked, false);
    assert.equal('retainagePercent' in locked, false);
  });

  it('reabre a fatura com o percentual guardado', () => {
    const values = projectBillingToFormValues(billing());
    assert.equal(values.retainageMode, 'percent');
    assert.equal(values.retainage, '5');
    assert.equal(values.dueDate, '2026-06-15');

    const byAmount = projectBillingToFormValues(
      billing({ retainagePercent: null, retainageAmount: '0.00' }),
    );
    assert.equal(byAmount.retainageMode, 'amount');
    assert.equal(byAmount.retainage, '');
  });

  it('exporta CSV com valores em vírgula e situação em português', () => {
    const [header, row] = projectBillingsCsvRows([billing()]);
    assert.equal(header[0], 'Número');
    assert.deepEqual(row.slice(4, 8), [
      '15/06/2026',
      '10000,00',
      '500,00',
      '9500,00',
    ]);
    assert.equal(row[10], 'Vencida');
  });
});
