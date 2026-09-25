import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nameKey } from './name-key.ts';

describe('nameKey', () => {
  it('ignora maiúsculas, acentos e espaços', () => {
    const variants = [
      'Posto Ipiranga',
      'posto ipiranga ',
      '  POSTO  IPIRANGA',
      'Pôsto Ipirangá',
    ];
    for (const variant of variants) {
      assert.equal(nameKey(variant), 'posto ipiranga');
    }
  });

  it('mantém nomes diferentes distintos', () => {
    assert.notEqual(nameKey('Posto Ipiranga'), nameKey('Posto Ipiranga 2'));
  });

  it('nome só com espaços vira chave vazia', () => {
    assert.equal(nameKey('   '), '');
  });
});
