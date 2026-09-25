import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addMonthsClamped, monthlyDueDates } from './date.ts';
import {
  digitableLineError,
  formatDigitableLine,
  normalizeDigitableLine,
} from './digitable-line.ts';
import {
  alphaLabel,
  duplicatedLabels,
  installmentLabels,
} from './installment-labels.ts';
import { netOfDeductions, splitMoney, sumMoney } from './money.ts';

describe('vencimentos mensais', () => {
  it('dia inexistente cai no último dia do mês, nunca no mês seguinte', () => {
    assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28');
    assert.equal(addMonthsClamped('2028-01-31', 1), '2028-02-29');
    assert.equal(addMonthsClamped('2026-03-31', 1), '2026-04-30');
  });

  it('calcula sempre a partir do primeiro vencimento, sem encadear', () => {
    assert.deepEqual(monthlyDueDates('2026-01-31', 4, 1), [
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('atravessa o ano e respeita intervalos maiores que um mês', () => {
    assert.deepEqual(monthlyDueDates('2026-11-15', 3, 2), [
      '2026-11-15',
      '2027-01-15',
      '2027-03-15',
    ]);
  });
});

describe('divisão em centavos', () => {
  it('R$ 1.000,00 em 3 vira 333,34 + 333,33 + 333,33', () => {
    assert.deepEqual(splitMoney('1000.00', 3), ['333.34', '333.33', '333.33']);
  });

  it('toda a sobra de centavos vai para o primeiro boleto', () => {
    assert.deepEqual(splitMoney('0.05', 3), ['0.03', '0.01', '0.01']);
    assert.deepEqual(splitMoney('100.00', 7), [
      '14.32',
      '14.28',
      '14.28',
      '14.28',
      '14.28',
      '14.28',
      '14.28',
    ]);
  });

  it('a soma das partes é sempre igual ao total', () => {
    for (const [total, parts] of [
      ['1234.56', 7],
      ['0.99', 60],
      ['99999.99', 13],
    ] as const) {
      assert.equal(sumMoney(splitMoney(total, parts)), total);
    }
  });
});

describe('rótulos dos boletos', () => {
  it('alfabético segue A…Z e depois AA, AB…', () => {
    assert.equal(alphaLabel(0), 'A');
    assert.equal(alphaLabel(25), 'Z');
    assert.equal(alphaLabel(26), 'AA');
    assert.equal(alphaLabel(27), 'AB');
    assert.equal(alphaLabel(51), 'AZ');
    assert.equal(alphaLabel(52), 'BA');
  });

  it('numérico começa em 1 e manual preserva o que foi digitado', () => {
    assert.deepEqual(installmentLabels('numeric', 3), ['1', '2', '3']);
    assert.deepEqual(installmentLabels('manual', 3, ['X', 'Y']), [
      'X',
      'Y',
      '',
    ]);
  });

  it('detecta rótulos repetidos ignorando maiúsculas e espaços', () => {
    assert.deepEqual([...duplicatedLabels(['A', ' a', 'B'])], ['A']);
    assert.equal(duplicatedLabels(['A', 'B', '']).size, 0);
  });
});

describe('linha digitável', () => {
  const bankSlip = '00190000090123456789701234567897715510000560000';

  it('aceita boleto bancário e arrecadação com dígitos corretos', () => {
    assert.equal(digitableLineError(bankSlip), null);
    assert.equal(
      digitableLineError('856700000123345000012020609150000006000000000018'),
      null,
    );
    assert.equal(
      digitableLineError('858000000674890000022027610100000008000000000027'),
      null,
    );
  });

  it('aceita colagem com espaços e pontos e normaliza para dígitos', () => {
    const pasted = formatDigitableLine(bankSlip);
    assert.equal(
      pasted,
      '00190.00009 01234.567897 01234.567897 7 15510000560000',
    );
    assert.equal(digitableLineError(pasted), null);
    assert.equal(normalizeDigitableLine(pasted), bankSlip);
  });

  it('recusa dígito verificador, comprimento e caracteres inválidos', () => {
    assert.equal(
      digitableLineError(`${bankSlip.slice(0, 9)}0${bankSlip.slice(10)}`),
      'Linha digitável inválida: dígito verificador do 1º campo não confere',
    );
    assert.equal(
      digitableLineError('123'),
      'Linha digitável deve ter 47 dígitos (boleto bancário) ou 48 (arrecadação); foram informados 3',
    );
    assert.equal(
      digitableLineError(`${bankSlip}x`),
      'Linha digitável deve conter apenas números, espaços e pontos',
    );
  });
});

describe('prévia do líquido da nota de serviço', () => {
  it('subtrai as retenções do bruto', () => {
    assert.equal(netOfDeductions('5000.00', ['550.00', '250.00']), '4200.00');
    assert.equal(netOfDeductions('5000.00', []), '5000.00');
  });

  it('não mostra líquido quando as retenções igualam ou passam do bruto', () => {
    assert.equal(netOfDeductions('1000.00', ['1000.00']), null);
    assert.equal(netOfDeductions('1000.00', ['600.00', '500.00']), null);
  });

  it('não mostra líquido com valor incompleto', () => {
    assert.equal(netOfDeductions('', []), null);
    assert.equal(netOfDeductions('1000.00', ['']), null);
  });
});
