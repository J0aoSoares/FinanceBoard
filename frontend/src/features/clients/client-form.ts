import {
  CONTACT_ROLE_LABELS,
  type Client,
  type ClientContact,
  type ClientInput,
  type ContactInput,
  type ContactRole,
  type CreateProjectInput,
  type PersonType,
  type Project,
  type ProjectStatus,
} from '../../api/types.ts';
import {
  emailError,
  formatPhone,
  phoneError,
  zipCodeError,
} from '../../lib/contact-format.ts';
import {
  documentError,
  formatDocument,
  onlyDigits,
} from '../../lib/document.ts';

export type FormErrors = Record<string, string>;

export interface ContactRow {
  key: string;
  id?: string;
  name: string;
  role: ContactRole;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface ClientFormValues {
  personType: PersonType;
  name: string;
  tradeName: string;
  document: string;
  municipalRegistration: string;
  phone: string;
  email: string;
  zipCode: string;
  street: string;
  streetNumber: string;
  complement: string;
  district: string;
  city: string;
  state: string | null;
  notes: string;
  contacts: ContactRow[];
}

let rowSequence = 0;
export const newRowKey = () => `row-${(rowSequence += 1)}`;

export const emptyContactRow = (
  role: ContactRole = 'ENGINEER',
): ContactRow => ({
  key: newRowKey(),
  name: '',
  role,
  phone: '',
  email: '',
  isPrimary: false,
});

export const emptyClientForm = (name = ''): ClientFormValues => ({
  personType: 'COMPANY',
  name,
  tradeName: '',
  document: '',
  municipalRegistration: '',
  phone: '',
  email: '',
  zipCode: '',
  street: '',
  streetNumber: '',
  complement: '',
  district: '',
  city: '',
  state: null,
  notes: '',
  contacts: [],
});

export const contactToRow = (contact: ClientContact): ContactRow => ({
  key: contact.id,
  id: contact.id,
  name: contact.name,
  role: contact.role,
  phone: contact.phone ? formatPhone(contact.phone) : '',
  email: contact.email ?? '',
  isPrimary: contact.isPrimary,
});

export const clientToFormValues = (client: Client): ClientFormValues => ({
  personType: client.personType,
  name: client.name,
  tradeName: client.tradeName ?? '',
  document: formatDocument(client.document),
  municipalRegistration: client.municipalRegistration ?? '',
  phone: formatPhone(client.phone),
  email: client.email ?? '',
  zipCode: client.zipCode ?? '',
  street: client.street ?? '',
  streetNumber: client.streetNumber ?? '',
  complement: client.complement ?? '',
  district: client.district ?? '',
  city: client.city ?? '',
  state: client.state,
  notes: client.notes ?? '',
  contacts: client.contacts.map(contactToRow),
});

const filled = (value: string) => value.trim() !== '';

export function validateContact(row: ContactRow, prefix: string): FormErrors {
  const errors: FormErrors = {};
  if (!filled(row.name)) {
    errors[`${prefix}name`] = 'Nome do contato é obrigatório';
  }
  if (!filled(row.phone) && !filled(row.email)) {
    errors[`${prefix}phone`] = 'Informe telefone ou e-mail';
  }
  if (filled(row.phone)) {
    const error = phoneError(row.phone);
    if (error) {
      errors[`${prefix}phone`] = error;
    }
  }
  if (filled(row.email)) {
    const error = emailError(row.email);
    if (error) {
      errors[`${prefix}email`] = error;
    }
  }
  return errors;
}

export function validateClient(
  values: ClientFormValues,
  prefix = '',
): FormErrors {
  const errors: FormErrors = {};
  if (!filled(values.name)) {
    errors[`${prefix}name`] = 'Razão social / nome do cliente é obrigatório';
  }
  if (filled(values.document)) {
    const error = documentError(values.document, values.personType);
    if (error) {
      errors[`${prefix}document`] = error;
    }
  }
  if (filled(values.phone)) {
    const error = phoneError(values.phone);
    if (error) {
      errors[`${prefix}phone`] = error;
    }
  }
  if (filled(values.email)) {
    const error = emailError(values.email);
    if (error) {
      errors[`${prefix}email`] = error;
    }
  }
  if (filled(values.zipCode)) {
    const error = zipCodeError(values.zipCode);
    if (error) {
      errors[`${prefix}zipCode`] = error;
    }
  }
  const primaryRoles = new Set<ContactRole>();
  values.contacts.forEach((row, index) => {
    Object.assign(errors, validateContact(row, `${prefix}contacts.${index}.`));
    if (row.isPrimary) {
      if (primaryRoles.has(row.role)) {
        errors[`${prefix}contacts.${index}.isPrimary`] =
          `Já existe um contato principal de ${CONTACT_ROLE_LABELS[row.role]}`;
      }
      primaryRoles.add(row.role);
    }
  });
  return errors;
}

type Mode = 'create' | 'update';

function optional(
  value: string,
  mode: Mode,
  normalize = (text: string) => text,
) {
  const text = value.trim();
  if (text === '') {
    return mode === 'update' ? null : undefined;
  }
  return normalize(text);
}

function withoutUndefined<T extends object>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

export function contactInput(row: ContactRow, mode: Mode): ContactInput {
  return withoutUndefined({
    id: row.id,
    name: row.name.trim(),
    role: row.role,
    phone: optional(row.phone, mode, onlyDigits),
    email: optional(row.email, mode),
    isPrimary: row.isPrimary,
  });
}

export function clientInput(
  values: ClientFormValues,
  mode: Mode,
  excludeContactKey?: string,
): ClientInput & { name: string } {
  return withoutUndefined({
    personType: values.personType,
    name: values.name.trim(),
    tradeName: optional(values.tradeName, mode),
    document: optional(values.document, mode, onlyDigits),
    municipalRegistration: optional(values.municipalRegistration, mode),
    phone: optional(values.phone, mode, onlyDigits),
    email: optional(values.email, mode),
    zipCode: optional(values.zipCode, mode, onlyDigits),
    street: optional(values.street, mode),
    streetNumber: optional(values.streetNumber, mode),
    complement: optional(values.complement, mode),
    district: optional(values.district, mode),
    city: optional(values.city, mode),
    state: values.state ?? (mode === 'update' ? null : undefined),
    notes: optional(values.notes, mode),
    contacts: values.contacts
      .filter((row) => row.key !== excludeContactKey)
      .map((row) =>
        contactInput(row, mode === 'update' && row.id ? 'update' : 'create'),
      ),
  });
}

export type ClientChoice =
  | {
      mode: 'existing';
      clientId: string | null;
      draft: ClientFormValues | null;
    }
  | { mode: 'new'; draft: ClientFormValues };

export type ReferenceChoice =
  | { kind: 'none' }
  | { kind: 'saved'; contactId: string }
  | { kind: 'row'; key: string };

export interface ProjectClientState {
  client: ClientChoice;
  reference: ReferenceChoice;
  newContact: ContactRow | null;
}

export const emptyProjectClientState = (): ProjectClientState => ({
  client: { mode: 'existing', clientId: null, draft: null },
  reference: { kind: 'none' },
  newContact: null,
});

export const projectClientState = (project: Project): ProjectClientState => ({
  client: { mode: 'existing', clientId: project.clientId, draft: null },
  reference: project.referenceContactId
    ? { kind: 'saved', contactId: project.referenceContactId }
    : { kind: 'none' },
  newContact: null,
});

export const editableRows = (state: ProjectClientState) =>
  state.client.draft?.contacts ?? [];

function referencedRow(state: ProjectClientState) {
  if (state.reference.kind !== 'row') {
    return null;
  }
  const key = state.reference.key;
  if (state.newContact?.key === key) {
    return state.newContact;
  }
  return editableRows(state).find((row) => row.key === key) ?? null;
}

export function validateProjectClient(state: ProjectClientState): FormErrors {
  const errors: FormErrors = {};
  if (state.client.mode === 'existing' && !state.client.clientId) {
    errors['client.id'] = 'Cliente da obra é obrigatório';
  }
  if (state.client.draft) {
    Object.assign(errors, validateClient(state.client.draft, 'client.'));
  }
  if (state.newContact) {
    Object.assign(errors, validateContact(state.newContact, 'newContact.'));
  }
  return errors;
}

export function buildProjectInput(
  name: string,
  status: ProjectStatus,
  state: ProjectClientState,
  editing: boolean,
): CreateProjectInput {
  const row = referencedRow(state);
  const newReference =
    row && !row.id ? { newReferenceContact: contactInput(row, 'create') } : {};
  const savedReference =
    state.reference.kind === 'saved'
      ? { referenceContactId: state.reference.contactId }
      : row?.id
        ? { referenceContactId: row.id }
        : state.reference.kind === 'none' && editing
          ? { referenceContactId: null }
          : {};
  const excluded = row && !row.id ? row.key : undefined;

  const client =
    state.client.mode === 'new'
      ? { client: clientInput(state.client.draft, 'create', excluded) }
      : {
          clientId: state.client.clientId as string,
          ...(state.client.draft
            ? {
                clientChanges: clientInput(
                  state.client.draft,
                  'update',
                  excluded,
                ),
              }
            : {}),
        };

  return {
    name: name.trim(),
    status,
    ...client,
    ...savedReference,
    ...newReference,
  };
}

export const referenceOptions = (
  savedContacts: ClientContact[],
  state: ProjectClientState,
) => {
  const draft = state.client.draft;
  const rows = draft
    ? draft.contacts.filter((row) => row.name.trim() !== '')
    : savedContacts.map(contactToRow);
  const extra =
    state.newContact && state.newContact.name.trim() !== ''
      ? [state.newContact]
      : [];
  return [...rows, ...extra].map((row) => ({
    value: row.id ? `saved:${row.id}` : `row:${row.key}`,
    label: `${row.name} · ${CONTACT_ROLE_LABELS[row.role]}`,
  }));
};

export const referenceValue = (reference: ReferenceChoice) =>
  reference.kind === 'saved'
    ? `saved:${reference.contactId}`
    : reference.kind === 'row'
      ? `row:${reference.key}`
      : null;

export const parseReferenceValue = (value: string | null): ReferenceChoice => {
  if (!value) {
    return { kind: 'none' };
  }
  const [kind, id] = value.split(/:(.*)/s);
  return kind === 'saved'
    ? { kind: 'saved', contactId: id }
    : { kind: 'row', key: id };
};

export const clientLabel = (client: {
  name: string;
  tradeName: string | null;
}) =>
  client.tradeName && client.tradeName !== client.name
    ? `${client.name} (${client.tradeName})`
    : client.name;

export const projectClientName = (
  project: Pick<Project, 'client' | 'clientName'>,
) => project.client?.name ?? project.clientName ?? '';
