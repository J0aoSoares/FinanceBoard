import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ContactRole, PersonType, Prisma } from '@prisma/client';
import {
  documentError,
  onlyDigits,
  phoneError,
  zipCodeError,
} from '../common/br-document.util';
import { nameKey } from '../common/name-key.util';
import { ClientContactDto } from './dto/client-contact.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  ENGINEER: 'Engenheiro',
  FINANCE: 'Financeiro',
  PURCHASING: 'Compras',
  ADMINISTRATIVE: 'Administrativo',
  OTHER: 'Outro',
};

export const CLIENT_NOT_FOUND = 'Cliente não encontrado';

type ExistingClient = { personType: PersonType; document: string | null };

function digitsOrError(
  value: string | null | undefined,
  validate: (digits: string) => string | null,
  prefix = '',
) {
  if (value === undefined || value === null) {
    return value;
  }
  const digits = onlyDigits(value);
  const error = validate(digits);
  if (error) {
    throw new BadRequestException(`${prefix}${error}`);
  }
  return digits;
}

export function clientFields(dto: UpdateClientDto, existing?: ExistingClient) {
  const personType = dto.personType ?? existing?.personType ?? 'COMPANY';
  const documentToCheck =
    dto.document !== undefined ? dto.document : existing?.document;
  const document =
    documentToCheck === undefined || documentToCheck === null
      ? documentToCheck
      : digitsOrError(documentToCheck, (digits) =>
          documentError(digits, personType),
        );

  return {
    personType: dto.personType,
    name: dto.name,
    nameKey: dto.name === undefined ? undefined : nameKey(dto.name),
    tradeName: dto.tradeName,
    document:
      dto.document === undefined && !dto.personType ? undefined : document,
    municipalRegistration: dto.municipalRegistration,
    phone: digitsOrError(dto.phone, phoneError),
    email: dto.email,
    zipCode: digitsOrError(dto.zipCode, zipCodeError),
    street: dto.street,
    streetNumber: dto.streetNumber,
    complement: dto.complement,
    district: dto.district,
    city: dto.city,
    state: dto.state,
    notes: dto.notes,
  };
}

export function contactFields(contact: ClientContactDto) {
  const prefix = `Contato "${contact.name}": `;
  const phone = digitsOrError(contact.phone, phoneError, prefix) ?? null;
  const email = contact.email ?? null;
  if (!phone && !email) {
    throw new BadRequestException(`${prefix}informe telefone ou e-mail`);
  }
  return {
    name: contact.name,
    role: contact.role,
    phone,
    email,
    isPrimary: contact.isPrimary ?? false,
  };
}

export function assertSinglePrimaryPerRole(
  contacts: { role: ContactRole; isPrimary?: boolean }[],
) {
  const seen = new Set<ContactRole>();
  for (const contact of contacts) {
    if (!contact.isPrimary) {
      continue;
    }
    if (seen.has(contact.role)) {
      throw new BadRequestException(
        `Só pode haver um contato principal por função: ${CONTACT_ROLE_LABELS[contact.role]}`,
      );
    }
    seen.add(contact.role);
  }
}

export async function createClient(
  tx: Prisma.TransactionClient,
  dto: CreateClientDto,
) {
  const contacts = (dto.contacts ?? []).map(contactFields);
  assertSinglePrimaryPerRole(contacts);
  const fields = clientFields(dto);
  return tx.client.create({
    data: {
      ...fields,
      name: dto.name,
      nameKey: nameKey(dto.name),
      contacts: { create: contacts },
    },
  });
}

export async function updateClient(
  tx: Prisma.TransactionClient,
  id: string,
  dto: UpdateClientDto,
) {
  const existing = await tx.client.findUnique({
    where: { id },
    include: { contacts: true },
  });
  if (!existing) {
    throw new NotFoundException(CLIENT_NOT_FOUND);
  }
  if (dto.name !== undefined && dto.name.trim() === '') {
    throw new BadRequestException(
      'Razão social / nome do cliente é obrigatório',
    );
  }

  const updated = await tx.client.update({
    where: { id },
    data: clientFields(dto, existing),
  });

  if (dto.contacts) {
    await syncContacts(tx, id, existing.contacts, dto.contacts);
  }
  return updated;
}

async function syncContacts(
  tx: Prisma.TransactionClient,
  clientId: string,
  current: { id: string }[],
  contacts: ClientContactDto[],
) {
  const fields = contacts.map((contact) => ({
    id: contact.id,
    data: contactFields(contact),
  }));
  assertSinglePrimaryPerRole(fields.map((field) => field.data));

  const currentIds = new Set(current.map((contact) => contact.id));
  for (const field of fields) {
    if (field.id && !currentIds.has(field.id)) {
      throw new BadRequestException(
        `Contato "${field.data.name}" não pertence a este cliente`,
      );
    }
  }

  const keptIds = fields
    .map((field) => field.id)
    .filter((id): id is string => Boolean(id));
  await tx.clientContact.deleteMany({
    where: { clientId, id: { notIn: keptIds } },
  });
  await tx.clientContact.updateMany({
    where: { clientId },
    data: { isPrimary: false },
  });
  for (const field of fields) {
    if (field.id) {
      await tx.clientContact.update({
        where: { id: field.id },
        data: field.data,
      });
    } else {
      await tx.clientContact.create({ data: { ...field.data, clientId } });
    }
  }
}

export async function createContact(
  tx: Prisma.TransactionClient,
  clientId: string,
  dto: ClientContactDto,
) {
  return tx.clientContact.create({
    data: { ...contactFields(dto), clientId },
  });
}

export function translateClientWriteError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      return target.includes('document')
        ? new ConflictException('Já existe um cliente com esse CPF/CNPJ')
        : new ConflictException(
            'Só pode haver um contato principal por função neste cliente',
          );
    }
    if (error.code === 'P2025') {
      return new NotFoundException(CLIENT_NOT_FOUND);
    }
  }
  return null;
}
