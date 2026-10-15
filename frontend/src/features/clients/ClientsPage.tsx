import { Anchor, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/display/DataTable';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import tableClasses from '../../components/display/DataTable.module.css';
import { RowActions } from '../../components/RowActions';
import { useAuth } from '../../auth/use-auth';
import { useClients, useDeleteClient } from '../../hooks/use-clients';
import { formatPhone } from '../../lib/contact-format';
import { formatDocument, onlyDigits } from '../../lib/document';
import { nameKey } from '../../lib/name-key';
import { CONTACT_ROLE_LABELS, type ClientListItem } from '../../api/types';
import { ClientFormModal } from './ClientFormModal';

type FormState =
  { open: false } | { open: true; client: ClientListItem | null };

const matches = (client: ClientListItem, search: string) => {
  const key = nameKey(search);
  const digits = onlyDigits(search);
  return (
    key === '' ||
    nameKey(`${client.name} ${client.tradeName ?? ''}`).includes(key) ||
    (digits !== '' && (client.document ?? '').includes(digits))
  );
};

export function ClientsPage() {
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [search, setSearch] = useState('');
  const { canWrite } = useAuth();
  const { data, isLoading, isError, error } = useClients();
  const deleteClient = useDeleteClient();

  const clients = (data ?? []).filter((client) => matches(client, search));

  const confirmDelete = (client: ClientListItem) =>
    modals.openConfirmModal({
      title: 'Excluir cliente',
      centered: true,
      children: (
        <Text size="sm">
          O cliente <strong>{client.name}</strong> e os contatos dele serão
          removidos.
          {client.projectCount > 0 &&
            ' Ele tem obras vinculadas, então a exclusão será recusada.'}
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteClient.mutate(client.id),
    });

  const columns: DataTableColumn<ClientListItem>[] = [
    {
      key: 'name',
      header: 'Cliente',
      render: (client) => (
        <>
          <Anchor component={Link} to={`/clients/${client.id}`} fw={500}>
            {client.name}
          </Anchor>
          {client.tradeName && (
            <span className={tableClasses.secondary}>{client.tradeName}</span>
          )}
        </>
      ),
    },
    {
      key: 'document',
      header: 'CNPJ / CPF',
      render: (client) => formatDocument(client.document) || '—',
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (client) => formatPhone(client.phone) || '—',
    },
    {
      key: 'contact',
      header: 'Contato principal',
      render: (client) =>
        client.primaryContact ? (
          <>
            {client.primaryContact.name}
            <span className={tableClasses.secondary}>
              {CONTACT_ROLE_LABELS[client.primaryContact.role]}
              {client.primaryContact.phone &&
                ` · ${formatPhone(client.primaryContact.phone)}`}
            </span>
          </>
        ) : (
          '—'
        ),
    },
    {
      key: 'projects',
      header: 'Obras',
      numeric: true,
      render: (client) => client.projectCount,
    },
  ];

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Clientes das obras, com documentos e contatos de referência.
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, client: null })}
          >
            Novo cliente
          </Button>
        )}
      </Group>

      <TextInput
        size="xs"
        w={320}
        leftSection={<IconSearch size={14} />}
        placeholder="Buscar por nome, fantasia ou CNPJ/CPF"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar os clientes"
      >
        <DataTable
          columns={columns}
          items={clients}
          rowKey={(client) => client.id}
          emptyMessage={
            search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'
          }
          renderActions={
            canWrite
              ? (client) => (
                  <RowActions
                    label={`Ações de ${client.name}`}
                    onEdit={() => setFormState({ open: true, client })}
                    onDelete={() => confirmDelete(client)}
                  />
                )
              : undefined
          }
          footer={`${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`}
        />
      </QueryBoundary>

      {formState.open && (
        <ClientFormModal
          key={formState.client?.id ?? 'new'}
          client={formState.client}
          onClose={() => setFormState({ open: false })}
        />
      )}
    </Stack>
  );
}
