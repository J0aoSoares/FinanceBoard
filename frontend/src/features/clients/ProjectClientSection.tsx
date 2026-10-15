import { Button, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { IconArrowBackUp, IconEye, IconPlus, IconX } from '@tabler/icons-react';
import { ClientSelect } from '../../components/fields/ClientSelect';
import { useClient } from '../../hooks/use-clients';
import { ClientDetailsFields, ContactEditor } from './ClientDetailsFields';
import {
  clientToFormValues,
  emptyClientForm,
  emptyContactRow,
  parseReferenceValue,
  referenceOptions,
  referenceValue,
  type ClientFormValues,
  type FormErrors,
  type ProjectClientState,
} from './client-form';
import classes from './ClientDetailsFields.module.css';

interface ProjectClientSectionProps {
  value: ProjectClientState;
  onChange: (value: ProjectClientState) => void;
  errors: FormErrors;
}

const keepReference = (
  state: ProjectClientState,
  draft: ClientFormValues | null,
) => {
  const reference = state.reference;
  if (!draft) {
    return reference;
  }
  const present =
    reference.kind === 'saved'
      ? draft.contacts.some((row) => row.id === reference.contactId)
      : reference.kind === 'row'
        ? draft.contacts.some((row) => row.key === reference.key) ||
          state.newContact?.key === reference.key
        : true;
  return present ? reference : { kind: 'none' as const };
};

export function ProjectClientSection({
  value,
  onChange,
  errors,
}: ProjectClientSectionProps) {
  const { client } = value;
  const savedId = client.mode === 'existing' ? client.clientId : null;
  const saved = useClient(savedId);
  const savedContacts = saved.data?.contacts ?? [];

  const selectClient = (clientId: string | null) =>
    onChange({
      client: { mode: 'existing', clientId, draft: null },
      reference: { kind: 'none' },
      newContact: null,
    });

  const startNewClient = (name: string) =>
    onChange({
      client: { mode: 'new', draft: emptyClientForm(name) },
      reference: { kind: 'none' },
      newContact: null,
    });

  const setDraft = (draft: ClientFormValues) =>
    onChange({
      ...value,
      client: { ...client, draft } as ProjectClientState['client'],
      reference: keepReference(value, draft),
    });

  const toggleDetails = () => {
    if (client.mode !== 'existing' || !saved.data) {
      return;
    }
    const draft = client.draft ? null : clientToFormValues(saved.data);
    onChange({
      ...value,
      client: { ...client, draft },
      reference: keepReference(value, draft),
    });
  };

  const addContact = () => {
    const row = emptyContactRow();
    if (client.draft) {
      onChange({
        ...value,
        client: {
          ...client,
          draft: { ...client.draft, contacts: [...client.draft.contacts, row] },
        } as ProjectClientState['client'],
        reference: { kind: 'row', key: row.key },
      });
    } else {
      onChange({
        ...value,
        newContact: row,
        reference: { kind: 'row', key: row.key },
      });
    }
  };

  const options = referenceOptions(savedContacts, value);
  const hasClient = client.mode === 'new' || Boolean(client.clientId);

  return (
    <Stack gap="sm">
      {client.mode === 'existing' ? (
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <div style={{ flex: 1 }}>
            <ClientSelect
              withAsterisk
              value={client.clientId}
              error={errors['client.id']}
              onChange={selectClient}
              onCreateRequest={startNewClient}
            />
          </div>
          {client.clientId && (
            <Button
              variant={client.draft ? 'light' : 'default'}
              leftSection={
                saved.isLoading ? (
                  <Loader size={14} />
                ) : client.draft ? (
                  <IconArrowBackUp size={15} />
                ) : (
                  <IconEye size={15} />
                )
              }
              disabled={!saved.data}
              onClick={toggleDetails}
            >
              {client.draft ? 'Desfazer e fechar' : 'Ver detalhes'}
            </Button>
          )}
        </Group>
      ) : (
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Novo cliente
          </Text>
          <Button
            size="compact-sm"
            variant="subtle"
            color="gray"
            leftSection={<IconX size={14} />}
            onClick={() => selectClient(null)}
          >
            Escolher cliente existente
          </Button>
        </Group>
      )}

      {client.draft && (
        <div className={classes.section}>
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Detalhes do cliente
            </Text>
            <Text size="xs" c="dimmed">
              {client.mode === 'new'
                ? 'Só o nome é obrigatório; o resto pode ser completado depois. O cliente é cadastrado junto com a obra.'
                : 'As alterações são salvas junto com a obra.'}
            </Text>
            <ClientDetailsFields
              value={client.draft}
              onChange={setDraft}
              errors={errors}
              prefix="client."
              collapseSecondary
            />
          </Stack>
        </div>
      )}

      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Select
          style={{ flex: 1 }}
          label="Contato de referência na obra"
          description="Opcional — por exemplo, o engenheiro responsável"
          placeholder={
            hasClient ? 'Sem contato de referência' : 'Escolha o cliente antes'
          }
          clearable
          disabled={!hasClient}
          data={options}
          value={referenceValue(value.reference)}
          onChange={(next) =>
            onChange({ ...value, reference: parseReferenceValue(next) })
          }
        />
        <Button
          variant="default"
          leftSection={<IconPlus size={15} />}
          disabled={!hasClient || value.newContact !== null}
          onClick={addContact}
        >
          Novo contato
        </Button>
      </Group>

      {value.newContact && !client.draft && (
        <ContactEditor
          row={value.newContact}
          errors={errors}
          prefix="newContact."
          onChange={(row) => onChange({ ...value, newContact: row })}
          onRemove={() =>
            onChange({
              ...value,
              newContact: null,
              reference: { kind: 'none' },
            })
          }
        />
      )}
    </Stack>
  );
}
