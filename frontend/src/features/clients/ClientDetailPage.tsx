import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconPencil } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import tableClasses from '../../components/display/DataTable.module.css';
import { useAuth } from '../../auth/use-auth';
import { useClient } from '../../hooks/use-clients';
import { formatPhone, formatZipCode } from '../../lib/contact-format';
import { formatDocument } from '../../lib/document';
import {
  CONTACT_ROLE_LABELS,
  PERSON_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  type ClientDetail,
} from '../../api/types';
import { ClientFormModal } from './ClientFormModal';
import classes from '../projects/ProjectDetailPage.module.css';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={classes.field}>
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{children || '—'}</span>
    </div>
  );
}

const address = (client: ClientDetail) =>
  [
    [client.street, client.streetNumber].filter(Boolean).join(', '),
    client.complement,
    client.district,
    [client.city, client.state].filter(Boolean).join(' / '),
    formatZipCode(client.zipCode),
  ]
    .filter(Boolean)
    .join(' · ');

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const { canWrite } = useAuth();
  const client = useClient(id);
  const [editing, setEditing] = useState(false);
  const data = client.data;

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between">
        <Button
          component={Link}
          to="/clients"
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconArrowLeft size={15} />}
        >
          Voltar aos clientes
        </Button>
        {canWrite && data && (
          <Button
            leftSection={<IconPencil size={16} />}
            onClick={() => setEditing(true)}
          >
            Editar cliente
          </Button>
        )}
      </Group>

      <QueryBoundary
        isLoading={client.isLoading}
        isError={client.isError}
        error={client.error}
        errorTitle="Não foi possível carregar o cliente"
      >
        {!data ? (
          <Alert color="red" variant="light" title="Cliente não encontrado">
            O cliente solicitado não existe ou foi removido.
          </Alert>
        ) : (
          <Stack gap="lg">
            <div className={classes.header}>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={2}>
                    <Title order={3}>{data.name}</Title>
                    {data.tradeName && (
                      <Text size="sm" c="dimmed">
                        {data.tradeName}
                      </Text>
                    )}
                  </Stack>
                  <Badge variant="light" radius="xl">
                    {PERSON_TYPE_LABELS[data.personType]}
                  </Badge>
                </Group>
                <div className={classes.cards}>
                  <Field label={data.personType === 'COMPANY' ? 'CNPJ' : 'CPF'}>
                    {formatDocument(data.document)}
                  </Field>
                  <Field label="Telefone">{formatPhone(data.phone)}</Field>
                  <Field label="E-mail">{data.email}</Field>
                  {data.personType === 'COMPANY' && (
                    <Field label="Inscrição municipal">
                      {data.municipalRegistration}
                    </Field>
                  )}
                </div>
                <Field label="Endereço">{address(data)}</Field>
                {data.notes && <Field label="Observações">{data.notes}</Field>}
              </Stack>
            </div>

            <Stack gap="xs">
              <Text fw={600}>Contatos</Text>
              <div className={tableClasses.wrapper}>
                {data.contacts.length === 0 ? (
                  <p className={tableClasses.empty}>
                    Nenhum contato cadastrado.
                  </p>
                ) : (
                  <table className={tableClasses.table}>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Função</th>
                        <th>Telefone</th>
                        <th>E-mail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.contacts.map((contact) => (
                        <tr key={contact.id}>
                          <td>
                            {contact.name}{' '}
                            {contact.isPrimary && (
                              <Badge size="xs" variant="light">
                                Principal
                              </Badge>
                            )}
                          </td>
                          <td>{CONTACT_ROLE_LABELS[contact.role]}</td>
                          <td>{formatPhone(contact.phone) || '—'}</td>
                          <td>{contact.email ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Stack>

            <Stack gap="xs">
              <Text fw={600}>Obras</Text>
              {data.projects.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Nenhuma obra vinculada.
                </Text>
              ) : (
                <Group gap="xs">
                  {data.projects.map((project) => (
                    <Anchor
                      key={project.id}
                      component={Link}
                      to={`/projects/${project.id}`}
                      size="sm"
                    >
                      {project.name}
                      {project.status === 'CLOSED' &&
                        ` (${PROJECT_STATUS_LABELS.CLOSED.toLowerCase()})`}
                    </Anchor>
                  ))}
                </Group>
              )}
            </Stack>
          </Stack>
        )}
      </QueryBoundary>

      {editing && data && (
        <ClientFormModal client={data} onClose={() => setEditing(false)} />
      )}
    </Stack>
  );
}
