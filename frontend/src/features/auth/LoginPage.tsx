import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertTriangle, IconBuildingFactory2 } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/use-auth';
import { ApiError } from '../../lib/http';
import {
  emptyLoginForm,
  loginFormValidation,
  type LoginFormValues,
} from './login-form';
import classes from './LoginPage.module.css';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    mode: 'controlled',
    initialValues: emptyLoginForm(),
    validate: loginFormValidation,
    validateInputOnBlur: true,
  });

  const from = (location.state as { from?: string } | null)?.from ?? '/bills';

  if (status === 'authenticated') {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (submitted: LoginFormValues) => {
    setPending(true);
    setFailure(null);

    try {
      await login(submitted.email.trim(), submitted.password);
      navigate(from, { replace: true });
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.messages.join(' ')
          : 'Erro inesperado ao entrar',
      );
      form.setFieldValue('password', '');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={classes.root}>
      <div className={classes.card}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <Stack gap="xs">
              <div className={classes.brand}>
                <IconBuildingFactory2 size={24} className={classes.brandMark} />
                FinanceBoard
              </div>
              <p className={classes.subtitle}>Entre para acessar o painel.</p>
            </Stack>

            {failure && (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertTriangle size={18} />}
                title="Não foi possível entrar"
              >
                {failure}
              </Alert>
            )}

            <TextInput
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com.br"
              autoComplete="username"
              withAsterisk
              data-autofocus
              {...form.getInputProps('email')}
            />

            <PasswordInput
              label="Senha"
              placeholder="Sua senha"
              autoComplete="current-password"
              withAsterisk
              {...form.getInputProps('password')}
            />

            <Button type="submit" loading={pending} fullWidth>
              Entrar
            </Button>
          </Stack>
        </form>
      </div>
    </div>
  );
}
