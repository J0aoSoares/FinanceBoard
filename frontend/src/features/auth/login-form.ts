export interface LoginFormValues {
  email: string;
  password: string;
}

export const emptyLoginForm = (): LoginFormValues => ({
  email: '',
  password: '',
});

export const loginFormValidation = {
  email: (value: string) =>
    /^\S+@\S+\.\S+$/.test(value.trim()) ? null : 'Informe um e-mail válido',
  password: (value: string) => (value === '' ? 'Senha é obrigatória' : null),
};
