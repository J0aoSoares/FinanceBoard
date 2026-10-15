import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface BoundaryProps {
  resetKey: string;
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
  failedKey: string | null;
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, failedKey: null };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: BoundaryProps,
    state: BoundaryState,
  ): Partial<BoundaryState> | null {
    if (state.error && state.failedKey === null) {
      return { failedKey: props.resetKey };
    }
    if (state.error && state.failedKey !== props.resetKey) {
      return { error: null, failedKey: null };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <Stack p="lg">
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Algo deu errado nesta tela"
        >
          <Stack gap="sm" align="flex-start">
            <Text size="sm">
              Os dados já salvos não foram afetados. Tente de novo ou troque de
              aba; se o problema continuar, avise com o que estava fazendo.
            </Text>
            <Text size="xs" c="dimmed">
              {this.state.error.message}
            </Text>
            <Button
              size="xs"
              variant="light"
              onClick={() => this.setState({ error: null, failedKey: null })}
            >
              Tentar novamente
            </Button>
          </Stack>
        </Alert>
      </Stack>
    );
  }
}

export function ScreenErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}
