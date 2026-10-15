import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  emailError,
  formatPhone,
  formatZipCode,
  phoneError,
  zipCodeError,
} from '../../lib/contact-format.ts';
import { documentError, isValidCnpj, isValidCpf } from '../../lib/document.ts';
import {
  buildProjectInput,
  clientInput,
  emptyClientForm,
  emptyContactRow,
  emptyProjectClientState,
  validateClient,
  validateProjectClient,
  type ClientFormValues,
  type ProjectClientState,
} from './client-form.ts';

const client = (
  overrides: Partial<ClientFormValues> = {},
): ClientFormValues => ({
  ...emptyClientForm('Prefeitura de Itu'),
  ...overrides,
});

describe('documentos, telefone e CEP', () => {
  it('confere os dígitos verificadores de CNPJ e CPF', () => {
    assert.equal(isValidCnpj('11.222.333/0001-81'), true);
    assert.equal(isValidCnpj('11222333000182'), false);
    assert.equal(isValidCnpj('11111111111111'), false);
    assert.equal(isValidCpf('529.982.247-25'), true);
    assert.equal(isValidCpf('52998224726'), false);
    assert.equal(
      documentError('52998224725', 'COMPANY'),
      'CNPJ deve ter 14 dígitos',
    );
    assert.equal(
      documentError('52998224726', 'INDIVIDUAL'),
      'CPF inválido: dígitos verificadores não conferem',
    );
    assert.equal(documentError('529.982.247-25', 'INDIVIDUAL'), null);
  });

  it('valida e formata telefone fixo e celular com DDD', () => {
    assert.equal(formatPhone('11912345678'), '(11) 91234-5678');
    assert.equal(formatPhone('1134567890'), '(11) 3456-7890');
    assert.equal(phoneError('(11) 91234-5678'), null);
    assert.equal(phoneError('(11) 3456-7890'), null);
    assert.equal(
      phoneError('11812345678'),
      'Celular deve começar com 9 depois do DDD',
    );
    assert.equal(phoneError('2012345678'), 'Telefone com DDD inválido');
    assert.equal(
      phoneError('1191234'),
      'Telefone deve ter DDD e 8 ou 9 dígitos',
    );
  });

  it('valida CEP e e-mail', () => {
    assert.equal(formatZipCode('01310100'), '01310-100');
    assert.equal(zipCodeError('01310-100'), null);
    assert.equal(zipCodeError('0131'), 'CEP deve ter 8 dígitos');
    assert.equal(emailError('ana@itu.sp.gov.br'), null);
    assert.equal(emailError('sem-arroba'), 'Informe um e-mail válido');
  });
});

describe('formulário de cliente', () => {
  it('exige só o nome e valida o que foi preenchido', () => {
    assert.deepEqual(validateClient(client()), {});
    assert.deepEqual(validateClient(client({ name: ' ' })), {
      name: 'Razão social / nome do cliente é obrigatório',
    });
    assert.equal(
      validateClient(client({ document: '11222333000182' })).document,
      'CNPJ inválido: dígitos verificadores não conferem',
    );
  });

  it('recusa contato sem telefone e e-mail e dois principais na mesma função', () => {
    const errors = validateClient(
      client({
        contacts: [
          {
            ...emptyContactRow(),
            name: 'Paulo',
            phone: '11912345678',
            isPrimary: true,
          },
          { ...emptyContactRow(), name: 'João', isPrimary: true },
        ],
      }),
    );
    assert.equal(errors['contacts.1.phone'], 'Informe telefone ou e-mail');
    assert.equal(
      errors['contacts.1.isPrimary'],
      'Já existe um contato principal de Engenheiro',
    );
  });

  it('no cadastro omite campos vazios e guarda só dígitos', () => {
    assert.deepEqual(
      clientInput(
        client({
          document: '11.222.333/0001-81',
          phone: '(11) 3456-7890',
          tradeName: '  ',
          contacts: [
            {
              ...emptyContactRow('FINANCE'),
              name: ' Ana ',
              email: 'ana@x.com',
            },
          ],
        }),
        'create',
      ),
      {
        personType: 'COMPANY',
        name: 'Prefeitura de Itu',
        document: '11222333000181',
        phone: '1134567890',
        contacts: [
          {
            name: 'Ana',
            role: 'FINANCE',
            email: 'ana@x.com',
            isPrimary: false,
          },
        ],
      },
    );
  });

  it('na edição envia null para limpar campos', () => {
    const input = clientInput(client({ tradeName: '' }), 'update');
    assert.equal(input.tradeName, null);
    assert.equal(input.document, null);
    assert.equal(input.state, null);
  });
});

describe('cliente da obra', () => {
  const withNewClient = (): ProjectClientState => {
    const paulo = { ...emptyContactRow(), name: 'Paulo', phone: '11912345678' };
    const ana = {
      ...emptyContactRow('FINANCE'),
      name: 'Ana',
      email: 'ana@x.com',
    };
    return {
      client: { mode: 'new', draft: client({ contacts: [paulo, ana] }) },
      reference: { kind: 'row', key: paulo.key },
      newContact: null,
    };
  };

  it('cliente novo vai junto com a obra e o contato de referência sai da lista', () => {
    const input = buildProjectInput(
      ' Rua A ',
      'ACTIVE',
      withNewClient(),
      false,
    );
    assert.equal(input.name, 'Rua A');
    assert.equal(input.clientId, undefined);
    assert.deepEqual(
      input.client?.contacts?.map((contact) => contact.name),
      ['Ana'],
    );
    assert.equal(input.newReferenceContact?.name, 'Paulo');
  });

  it('cliente existente envia só o id e o contato salvo', () => {
    const state: ProjectClientState = {
      ...emptyProjectClientState(),
      client: { mode: 'existing', clientId: 'c1', draft: null },
      reference: { kind: 'saved', contactId: 'k1' },
    };
    assert.deepEqual(buildProjectInput('Obra', 'ACTIVE', state, false), {
      name: 'Obra',
      status: 'ACTIVE',
      clientId: 'c1',
      referenceContactId: 'k1',
    });
  });

  it('na edição sem contato envia null para limpar a referência', () => {
    const state: ProjectClientState = {
      ...emptyProjectClientState(),
      client: { mode: 'existing', clientId: 'c1', draft: null },
    };
    assert.equal(
      buildProjectInput('Obra', 'ACTIVE', state, true).referenceContactId,
      null,
    );
    assert.equal(
      'referenceContactId' in buildProjectInput('Obra', 'ACTIVE', state, false),
      false,
    );
  });

  it('contato novo de cliente existente vira newReferenceContact', () => {
    const contact = { ...emptyContactRow(), name: 'Bia', email: 'bia@x.com' };
    const state: ProjectClientState = {
      client: { mode: 'existing', clientId: 'c1', draft: null },
      reference: { kind: 'row', key: contact.key },
      newContact: contact,
    };
    const input = buildProjectInput('Obra', 'ACTIVE', state, false);
    assert.equal(input.newReferenceContact?.name, 'Bia');
    assert.equal(input.clientChanges, undefined);
  });

  it('exige cliente escolhido e valida o cliente novo com prefixo', () => {
    assert.deepEqual(validateProjectClient(emptyProjectClientState()), {
      'client.id': 'Cliente da obra é obrigatório',
    });
    const state = withNewClient();
    state.client = { mode: 'new', draft: client({ name: '' }) };
    assert.equal(
      validateProjectClient(state)['client.name'],
      'Razão social / nome do cliente é obrigatório',
    );
  });
});
