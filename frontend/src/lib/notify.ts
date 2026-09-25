import { notifications } from '@mantine/notifications';
import { ApiError } from './http';

export function notifySuccess(message: string) {
  notifications.show({
    color: 'green',
    title: 'Pronto',
    message,
  });
}

export function notifyApiError(
  error: unknown,
  title = 'Não foi possível concluir',
) {
  const messages =
    error instanceof ApiError
      ? error.messages
      : [error instanceof Error ? error.message : 'Erro inesperado'];

  notifications.show({
    color: 'red',
    title,
    message: messages.join(' '),
    autoClose: 8000,
  });
}
