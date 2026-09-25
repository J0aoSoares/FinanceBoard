import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { User } from '../../api/types';
import { useResetUserPassword } from '../../hooks/use-users';
import { PASSWORD_MESSAGE, validatePassword } from '../../lib/password';

interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
}

interface ResetPasswordFormValues {
  newPassword: string;
  confirmation: string;
}

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const resetPassword = useResetUserPassword();

  const form = useForm<ResetPasswordFormValues>({
    mode: 'controlled',
    initialValues: { newPassword: '', confirmation: '' },
    validate: {
      newPassword: (value) => validatePassword(value),
      confirmation: (value, values) =>
        value === values.newPassword ? null : 'As senhas não conferem',
    },
    validateInputOnBlur: true,
  });

  const handleSubmit = (submitted: ResetPasswordFormValues) => {
    resetPassword.mutate(
      { id: user.id, input: { newPassword: submitted.newPassword } },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Redefinir senha" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Uma nova senha será definida para <strong>{user.name}</strong>. As
            sessões abertas dessa pessoa serão encerradas.
          </Text>

          <PasswordInput
            label="Nova senha"
            description={PASSWORD_MESSAGE}
            withAsterisk
            data-autofocus
            {...form.getInputProps('newPassword')}
          />

          <PasswordInput
            label="Repita a nova senha"
            withAsterisk
            {...form.getInputProps('confirmation')}
          />

          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={onClose}
              disabled={resetPassword.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={resetPassword.isPending}>
              Redefinir
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
