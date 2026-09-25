import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../../auth/use-auth';
import { useChangeOwnPassword } from '../../hooks/use-users';
import { PASSWORD_MESSAGE, validatePassword } from '../../lib/password';

interface ChangePasswordModalProps {
  onClose: () => void;
}

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { logout } = useAuth();
  const changePassword = useChangeOwnPassword();

  const form = useForm<ChangePasswordFormValues>({
    mode: 'controlled',
    initialValues: { currentPassword: '', newPassword: '', confirmation: '' },
    validate: {
      currentPassword: (value) =>
        value === '' ? 'Informe a senha atual' : null,
      newPassword: (value, values) => {
        if (value === values.currentPassword) {
          return 'A nova senha deve ser diferente da senha atual';
        }
        return validatePassword(value);
      },
      confirmation: (value, values) =>
        value === values.newPassword ? null : 'As senhas não conferem',
    },
    validateInputOnBlur: true,
  });

  const handleSubmit = (submitted: ChangePasswordFormValues) => {
    changePassword.mutate(
      {
        currentPassword: submitted.currentPassword,
        newPassword: submitted.newPassword,
      },
      {
        onSuccess: () => {
          onClose();
          void logout();
        },
      },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Trocar senha" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Ao trocar a senha, a sessão é encerrada e você entra de novo com a
            senha nova.
          </Text>

          <PasswordInput
            label="Senha atual"
            autoComplete="current-password"
            withAsterisk
            data-autofocus
            {...form.getInputProps('currentPassword')}
          />

          <PasswordInput
            label="Nova senha"
            description={PASSWORD_MESSAGE}
            autoComplete="new-password"
            withAsterisk
            {...form.getInputProps('newPassword')}
          />

          <PasswordInput
            label="Repita a nova senha"
            autoComplete="new-password"
            withAsterisk
            {...form.getInputProps('confirmation')}
          />

          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={onClose}
              disabled={changePassword.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={changePassword.isPending}>
              Trocar senha
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
