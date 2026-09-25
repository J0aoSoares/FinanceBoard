import { Alert, Center, Loader } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { ApiError } from '../../lib/http';

interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  errorTitle: string;
  children: ReactNode;
}

export function QueryBoundary({
  isLoading,
  isError,
  error,
  errorTitle,
  children,
}: QueryBoundaryProps) {
  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Alert
        color="red"
        variant="light"
        icon={<IconAlertTriangle size={18} />}
        title={errorTitle}
      >
        {error instanceof ApiError
          ? error.messages.join(' ')
          : 'Erro inesperado'}
      </Alert>
    );
  }

  return children;
}
