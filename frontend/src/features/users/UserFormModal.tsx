import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  USER_ROLES,
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  type User,
  type UserRole,
} from '../../api/types';
import { useAuth } from '../../auth/use-auth';
import { useCreateUser, useUpdateUser } from '../../hooks/use-users';
import { PASSWORD_MESSAGE } from '../../lib/password';
import {
  buildCreatePayload,
  buildUpdatePayload,
  emptyUserForm,
  userFormValidation,
  userToFormValues,
  type UserFormValues,
} from './user-form';

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
}

const roleOptions = USER_ROLES.map((role) => ({
  value: role,
  label: USER_ROLE_LABELS[role],
}));

export function UserFormModal({ user, onClose }: UserFormModalProps) {
  const { user: currentUser } = useAuth();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const isEditing = user !== null;
  const isSelf = isEditing && user.id === currentUser?.id;

  const form = useForm<UserFormValues>({
    mode: 'controlled',
    initialValues: user ? userToFormValues(user) : emptyUserForm(),
    validate: userFormValidation(isEditing),
    validateInputOnBlur: true,
  });

  const pending = createUser.isPending || updateUser.isPending;
  const selectedRole = form.getValues().role;

  const handleSubmit = (submitted: UserFormValues) => {
    const onSuccess = () => onClose();

    if (isEditing) {
      updateUser.mutate(
        { id: user.id, input: buildUpdatePayload(submitted) },
        { onSuccess },
      );
    } else {
      createUser.mutate(buildCreatePayload(submitted), { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar usuário' : 'Novo usuário'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Maria Silva"
            withAsterisk
            data-autofocus
            {...form.getInputProps('name')}
          />

          <TextInput
            label="E-mail"
            type="email"
            placeholder="maria@empresa.com.br"
            description="Usado para entrar no sistema"
            withAsterisk
            {...form.getInputProps('email')}
          />

          {!isEditing && (
            <PasswordInput
              label="Senha inicial"
              description={PASSWORD_MESSAGE}
              withAsterisk
              {...form.getInputProps('password')}
            />
          )}

          <Select
            label="Papel"
            data={roleOptions}
            description={
              selectedRole ? USER_ROLE_DESCRIPTIONS[selectedRole] : undefined
            }
            withAsterisk
            allowDeselect={false}
            disabled={isSelf}
            {...form.getInputProps('role')}
            onChange={(value) =>
              form.setFieldValue('role', (value as UserRole | null) ?? null)
            }
          />

          <Switch
            label="Usuário ativo"
            description={
              isSelf
                ? 'Você não pode alterar o próprio papel nem se desativar'
                : 'Desativar encerra as sessões abertas imediatamente'
            }
            disabled={isSelf}
            checked={form.getValues().isActive}
            onChange={(event) =>
              form.setFieldValue('isActive', event.currentTarget.checked)
            }
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
