import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Project } from '../../api/types.ts';
import {
  emptyProjectDetails,
  projectAddress,
  projectDetailsInput,
  projectToDetails,
  validateProjectDetails,
} from './project-form.ts';

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Obra',
  clientName: null,
  clientId: 'c1',
  client: null,
  referenceContactId: null,
  referenceContact: null,
  status: 'ACTIVE',
  contractNumber: 'CT-14',
  startDate: '2026-03-01T00:00:00.000Z',
  expectedEndDate: null,
  zipCode: '13300000',
  street: 'Rua A',
  streetNumber: 's/n',
  complement: null,
  district: 'Centro',
  city: 'Itu',
  state: 'SP',
  details: 'Portão 2',
  ...overrides,
});

describe('detalhes da obra', () => {
  it('no cadastro omite campos vazios e guarda o CEP só em dígitos', () => {
    assert.deepEqual(
      projectDetailsInput(
        {
          ...emptyProjectDetails(),
          contractNumber: ' CT-14 ',
          zipCode: '13300-000',
          city: 'Itu',
          state: 'SP',
          details: '  ',
        },
        'create',
      ),
      {
        contractNumber: 'CT-14',
        zipCode: '13300000',
        city: 'Itu',
        state: 'SP',
      },
    );
  });

  it('na edição envia null para limpar', () => {
    const input = projectDetailsInput(emptyProjectDetails(), 'update');
    assert.equal(input.details, null);
    assert.equal(input.startDate, null);
    assert.equal(input.state, null);
  });

  it('valida CEP e término antes do início', () => {
    assert.deepEqual(validateProjectDetails(emptyProjectDetails()), {});
    assert.deepEqual(
      validateProjectDetails({
        ...emptyProjectDetails(),
        zipCode: '1330',
        startDate: '2026-05-01',
        expectedEndDate: '2026-04-30',
      }),
      {
        zipCode: 'CEP deve ter 8 dígitos',
        expectedEndDate: 'Previsão de término anterior ao início',
      },
    );
  });

  it('reabre a obra com os valores formatados e monta o endereço', () => {
    const values = projectToDetails(project());
    assert.equal(values.zipCode, '13300-000');
    assert.equal(values.startDate, '2026-03-01');
    assert.equal(values.complement, '');
    assert.equal(
      projectAddress(project()),
      'Rua A, s/n · Centro · Itu / SP · 13300-000',
    );
    assert.equal(
      projectAddress(
        project({
          street: null,
          streetNumber: null,
          district: null,
          city: null,
          state: null,
          zipCode: null,
        }),
      ),
      '',
    );
  });
});
