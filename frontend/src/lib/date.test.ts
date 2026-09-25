import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import dayjs from 'dayjs';
import { parseFormattedDate, parseTypedDate } from './date.ts';

before(() => {
  process.env.TZ = 'America/Sao_Paulo';
});

describe('parseTypedDate em UTC-3', () => {
  it('roda de fato no fuso de São Paulo', () => {
    assert.equal(new Date(2026, 7, 1).getTimezoneOffset(), 180);
    assert.equal(new Date('2026-08-01T00:00:00Z').getDate(), 31);
  });

  it('01/08/2026 vira 2026-08-01, nunca 2026-07-31', () => {
    assert.equal(parseTypedDate('01/08/2026'), '2026-08-01');
  });

  it('a data emitida volta a ser exibida como 01/08/2026', () => {
    const emitted = parseTypedDate('01/08/2026');
    assert.equal(dayjs(emitted).format('DD/MM/YYYY'), '01/08/2026');
  });
});

describe('parseTypedDate: formatos aceitos', () => {
  const accepted: [string, string][] = [
    ['01/08/2026', '2026-08-01'],
    ['1/8/2026', '2026-08-01'],
    ['01/08/26', '2026-08-01'],
    ['1/8/26', '2026-08-01'],
    ['01082026', '2026-08-01'],
    ['010826', '2026-08-01'],
    ['  01/08/2026  ', '2026-08-01'],
    ['31/12/2026', '2026-12-31'],
    ['29/02/2028', '2028-02-29'],
    ['29/02/2000', '2000-02-29'],
    ['01/01/00', '2000-01-01'],
    ['31/12/99', '2099-12-31'],
  ];

  for (const [input, expected] of accepted) {
    it(`"${input}" → ${expected}`, () => {
      assert.equal(parseTypedDate(input), expected);
    });
  }
});

describe('parseTypedDate: datas inválidas não são corrigidas', () => {
  const rejected = [
    '31/02/2026',
    '29/02/2027',
    '29/02/2100',
    '31/04/2026',
    '00/08/2026',
    '01/00/2026',
    '01/13/2026',
    '99/99/9999',
    '01/08/1899',
    '01/08/2100',
    '01/08/202',
    '01/08/2',
    '0108202',
    '01082',
    '1082026',
    '01-08-2026',
    '01.08.2026',
    '01/08-2026',
    '2026-08-01',
    'amanhã',
    '',
    '   ',
  ];

  for (const input of rejected) {
    it(`recusa "${input}"`, () => {
      assert.equal(parseTypedDate(input), null);
    });
  }
});

describe('parseFormattedDate', () => {
  it('aceita só dd/mm/aaaa completo', () => {
    assert.equal(parseFormattedDate('01/08/2026'), '2026-08-01');
  });

  it('não emite datas parciais durante a digitação', () => {
    for (const partial of ['01/08/20', '1/8/2026', '01082026', '010826']) {
      assert.equal(parseFormattedDate(partial), null);
    }
  });

  it('recusa dd/mm/aaaa inexistente', () => {
    assert.equal(parseFormattedDate('31/02/2026'), null);
  });
});
