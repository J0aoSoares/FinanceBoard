import {
  ActionIcon,
  Button,
  Checkbox,
  Collapse,
  Grid,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  CONTACT_ROLES,
  CONTACT_ROLE_LABELS,
  type ContactRole,
  type PersonType,
} from '../../api/types';
import {
  BRAZILIAN_STATES,
  formatPhone,
  formatZipCode,
} from '../../lib/contact-format';
import { formatDocument, onlyDigits } from '../../lib/document';
import {
  emptyContactRow,
  type ClientFormValues,
  type ContactRow,
  type FormErrors,
} from './client-form';
import classes from './ClientDetailsFields.module.css';

const roleOptions = CONTACT_ROLES.map((role) => ({
  value: role,
  label: CONTACT_ROLE_LABELS[role],
}));

const stateOptions = BRAZILIAN_STATES.map((state) => ({
  value: state,
  label: state,
}));

const formatOnBlur = (value: string, format: (digits: string) => string) => {
  const digits = onlyDigits(value);
  return digits === '' ? value.trim() : format(digits);
};

interface ContactEditorProps {
  row: ContactRow;
  errors: FormErrors;
  prefix: string;
  onChange: (row: ContactRow) => void;
  onRemove?: () => void;
}

export function ContactEditor({
  row,
  errors,
  prefix,
  onChange,
  onRemove,
}: ContactEditorProps) {
  const set = (patch: Partial<ContactRow>) => onChange({ ...row, ...patch });
  const error = (field: string) => errors[`${prefix}${field}`];

  return (
    <div className={classes.contact}>
      <Grid gap="xs" align="flex-start">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput
            size="xs"
            label="Nome"
            withAsterisk
            value={row.name}
            error={error('name')}
            onChange={(event) => set({ name: event.currentTarget.value })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Select
            size="xs"
            label="Função"
            data={roleOptions}
            allowDeselect={false}
            value={row.role}
            onChange={(role) => role && set({ role: role as ContactRole })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <TextInput
            size="xs"
            label="Telefone"
            placeholder="(11) 91234-5678"
            value={row.phone}
            error={error('phone')}
            onChange={(event) => set({ phone: event.currentTarget.value })}
            onBlur={() => set({ phone: formatOnBlur(row.phone, formatPhone) })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 2 }}>
          <Group gap={4} justify="flex-end" mt={{ base: 0, sm: 22 }}>
            <Tooltip label="Contato principal desta função" withArrow>
              <Checkbox
                size="xs"
                label="Principal"
                checked={row.isPrimary}
                error={error('isPrimary')}
                onChange={(event) =>
                  set({ isPrimary: event.currentTarget.checked })
                }
              />
            </Tooltip>
            {onRemove && (
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Remover contato ${row.name}`}
                onClick={onRemove}
              >
                <IconTrash size={15} />
              </ActionIcon>
            )}
          </Group>
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput
            size="xs"
            label="E-mail"
            placeholder="nome@empresa.com.br"
            value={row.email}
            error={error('email')}
            onChange={(event) => set({ email: event.currentTarget.value })}
          />
        </Grid.Col>
      </Grid>
    </div>
  );
}

interface ClientDetailsFieldsProps {
  value: ClientFormValues;
  onChange: (value: ClientFormValues) => void;
  errors: FormErrors;
  prefix?: string;
  collapseSecondary?: boolean;
}

export function ClientDetailsFields({
  value,
  onChange,
  errors,
  prefix = '',
  collapseSecondary = false,
}: ClientDetailsFieldsProps) {
  const [moreOpen, setMoreOpen] = useState(!collapseSecondary);
  const set = (patch: Partial<ClientFormValues>) =>
    onChange({ ...value, ...patch });
  const error = (field: string) => errors[`${prefix}${field}`];
  const isCompany = value.personType === 'COMPANY';

  const setContact = (index: number, row: ContactRow) =>
    set({
      contacts: value.contacts.map((current, position) =>
        position === index ? row : current,
      ),
    });

  const secondary = (
    <Grid gap="sm">
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <TextInput
          label="CEP"
          placeholder="00000-000"
          value={value.zipCode}
          error={error('zipCode')}
          onChange={(event) => set({ zipCode: event.currentTarget.value })}
          onBlur={() =>
            set({ zipCode: formatOnBlur(value.zipCode, formatZipCode) })
          }
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 8 }}>
        <TextInput
          label="Logradouro"
          value={value.street}
          onChange={(event) => set({ street: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 3 }}>
        <TextInput
          label="Número"
          value={value.streetNumber}
          onChange={(event) => set({ streetNumber: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 4 }}>
        <TextInput
          label="Complemento"
          value={value.complement}
          onChange={(event) => set({ complement: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 5 }}>
        <TextInput
          label="Bairro"
          value={value.district}
          onChange={(event) => set({ district: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 8, sm: 9 }}>
        <TextInput
          label="Cidade"
          value={value.city}
          onChange={(event) => set({ city: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 4, sm: 3 }}>
        <Select
          label="UF"
          searchable
          clearable
          data={stateOptions}
          value={value.state}
          onChange={(state) => set({ state })}
        />
      </Grid.Col>
      {isCompany && (
        <Grid.Col span={12}>
          <TextInput
            label="Inscrição municipal"
            value={value.municipalRegistration}
            onChange={(event) =>
              set({ municipalRegistration: event.currentTarget.value })
            }
          />
        </Grid.Col>
      )}
      <Grid.Col span={12}>
        <Textarea
          label="Observações"
          autosize
          minRows={2}
          value={value.notes}
          onChange={(event) => set({ notes: event.currentTarget.value })}
        />
      </Grid.Col>
    </Grid>
  );

  return (
    <Stack gap="sm">
      <SegmentedControl
        size="xs"
        value={value.personType}
        onChange={(personType) => set({ personType: personType as PersonType })}
        data={[
          { value: 'COMPANY', label: 'Pessoa jurídica' },
          { value: 'INDIVIDUAL', label: 'Pessoa física' },
        ]}
        style={{ alignSelf: 'flex-start' }}
      />

      <Grid gap="sm">
        <Grid.Col span={{ base: 12, sm: isCompany ? 7 : 12 }}>
          <TextInput
            label={isCompany ? 'Razão social' : 'Nome'}
            withAsterisk
            value={value.name}
            error={error('name')}
            onChange={(event) => set({ name: event.currentTarget.value })}
          />
        </Grid.Col>
        {isCompany && (
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <TextInput
              label="Nome fantasia"
              value={value.tradeName}
              onChange={(event) =>
                set({ tradeName: event.currentTarget.value })
              }
            />
          </Grid.Col>
        )}
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput
            label={isCompany ? 'CNPJ' : 'CPF'}
            placeholder={isCompany ? '00.000.000/0000-00' : '000.000.000-00'}
            value={value.document}
            error={error('document')}
            onChange={(event) => set({ document: event.currentTarget.value })}
            onBlur={() =>
              set({ document: formatOnBlur(value.document, formatDocument) })
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput
            label="Telefone"
            placeholder="(11) 3456-7890"
            value={value.phone}
            error={error('phone')}
            onChange={(event) => set({ phone: event.currentTarget.value })}
            onBlur={() =>
              set({ phone: formatOnBlur(value.phone, formatPhone) })
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput
            label="E-mail"
            placeholder="contato@cliente.com.br"
            value={value.email}
            error={error('email')}
            onChange={(event) => set({ email: event.currentTarget.value })}
          />
        </Grid.Col>
      </Grid>

      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            Contatos
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={() =>
              set({ contacts: [...value.contacts, emptyContactRow()] })
            }
          >
            Adicionar contato
          </Button>
        </Group>
        {value.contacts.length === 0 ? (
          <Text size="xs" c="dimmed">
            Nenhum contato. Cada contato precisa de telefone ou e-mail.
          </Text>
        ) : (
          value.contacts.map((row, index) => (
            <ContactEditor
              key={row.key}
              row={row}
              errors={errors}
              prefix={`${prefix}contacts.${index}.`}
              onChange={(next) => setContact(index, next)}
              onRemove={() =>
                set({
                  contacts: value.contacts.filter(
                    (_, position) => position !== index,
                  ),
                })
              }
            />
          ))
        )}
      </Stack>

      {collapseSecondary ? (
        <Stack gap="xs">
          <UnstyledButton
            className={classes.toggle}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            {moreOpen ? (
              <IconChevronDown size={15} />
            ) : (
              <IconChevronRight size={15} />
            )}
            Mais informações (endereço, inscrição municipal, observações)
          </UnstyledButton>
          <Collapse expanded={moreOpen}>{secondary}</Collapse>
        </Stack>
      ) : (
        secondary
      )}
    </Stack>
  );
}
