import { Badge, Button, Group, Menu, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconKey, IconPlus, IconUserOff } from '@tabler/icons-react';
import { useState } from 'react';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/display/DataTable';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { RowActions } from '../../components/RowActions';
import { useAuth } from '../../auth/use-auth';
import { useDeactivateUser, useUsers } from '../../hooks/use-users';
import { USER_ROLE_LABELS, type User } from '../../api/types';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserFormModal } from './UserFormModal';

type FormState = { open: false } | { open: true; user: User | null };
type ResetState = { open: false } | { open: true; user: User };

const ROLE_COLORS: Record<User['role'], string> = {
  ADMIN: 'blue',
  OPERATOR: 'teal',
  VIEWER: 'gray',
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [resetState, setResetState] = useState<ResetState>({ open: false });
  const { data, isLoading, isError, error } = useUsers();
  const deactivateUser = useDeactivateUser();

  const users = data ?? [];

  const confirmDeactivate = (user: User) =>
    modals.openConfirmModal({
      title: 'Desativar usuário',
      centered: true,
      children: (
        <Text size="sm">
          <strong>{user.name}</strong> deixa de conseguir entrar e as sessões
          abertas são encerradas na hora. O histórico de lançamentos é
          preservado — nada é apagado, e o acesso pode ser devolvido depois pela
          edição.
        </Text>
      ),
      labels: { confirm: 'Desativar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deactivateUser.mutate(user.id),
    });

  const columns: DataTableColumn<User>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (user) => (
        <Group gap="xs" wrap="nowrap">
          {user.name}
          {user.id === currentUser?.id && (
            <Badge size="xs" variant="light" color="gray">
              você
            </Badge>
          )}
        </Group>
      ),
    },
    { key: 'email', header: 'E-mail', render: (user) => user.email },
    {
      key: 'role',
      header: 'Papel',
      render: (user) => (
        <Badge variant="light" color={ROLE_COLORS[user.role]}>
          {USER_ROLE_LABELS[user.role]}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Situação',
      render: (user) => (
        <Badge variant="light" color={user.isActive ? 'green' : 'red'}>
          {user.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Quem acessa o sistema e com qual papel. Usuários são desativados,
          nunca excluídos.
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setFormState({ open: true, user: null })}
        >
          Novo usuário
        </Button>
      </Group>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar os usuários"
      >
        <DataTable
          columns={columns}
          items={users}
          rowKey={(user) => user.id}
          emptyMessage="Nenhum usuário cadastrado."
          renderActions={(user) => (
            <RowActions
              label={`Ações de ${user.name}`}
              onEdit={() => setFormState({ open: true, user })}
              onDelete={() => confirmDeactivate(user)}
              deleteLabel="Desativar"
              deleteIcon={<IconUserOff size={15} />}
              deleteDisabled={!user.isActive || user.id === currentUser?.id}
            >
              <Menu.Item
                leftSection={<IconKey size={15} />}
                onClick={() => setResetState({ open: true, user })}
              >
                Redefinir senha
              </Menu.Item>
            </RowActions>
          )}
          footer={`${users.length} ${
            users.length === 1 ? 'usuário' : 'usuários'
          }`}
        />
      </QueryBoundary>

      {formState.open && (
        <UserFormModal
          key={formState.user?.id ?? 'new'}
          user={formState.user}
          onClose={() => setFormState({ open: false })}
        />
      )}

      {resetState.open && (
        <ResetPasswordModal
          key={resetState.user.id}
          user={resetState.user}
          onClose={() => setResetState({ open: false })}
        />
      )}
    </Stack>
  );
}
