import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCreatePayload,
  emptyReceivableForm,
  projectCreationBlockedReason,
  receivableFormValidation,
} from './receivable-form.ts';

describe('formulário da NF de serviço', () => {
  it('só permite cadastrar obra na hora quando o tomador foi informado', () => {
    assert.equal(
      projectCreationBlockedReason(''),
      'Preencha o tomador antes de cadastrar a obra',
    );
    assert.equal(
      projectCreationBlockedReason('   '),
      'Preencha o tomador antes de cadastrar a obra',
    );
    assert.equal(projectCreationBlockedReason('Prefeitura Municipal'), null);
  });

  it('aceita NF sem obra e envia a obra como vazia', () => {
    const values = {
      ...emptyReceivableForm('company'),
      number: ' NFS-1 ',
      description: 'Consultoria',
      clientName: ' Cliente Avulso ',
      grossAmount: '1000.00',
      competence: '2026-08',
      issueDate: '2026-08-01',
      dueDate: '2026-09-01',
    };
    assert.equal('projectId' in receivableFormValidation, false);
    const payload = buildCreatePayload(values);
    assert.equal(payload.projectId, null);
    assert.equal(payload.number, 'NFS-1');
    assert.equal(payload.clientName, 'Cliente Avulso');
  });
});
