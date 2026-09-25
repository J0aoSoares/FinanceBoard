import type { CreateUserInput, UpdateUserInput, User } from '../../api/types';
import type { UserRole } from '../../api/types';
import { validatePassword } from '../../lib/password';

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole | null;
  isActive: boolean;
}

export const emptyUserForm = (): UserFormValues => ({
  name: '',
  email: '',
  password: '',
  role: 'OPERATOR',
  isActive: true,
});

export const userToFormValues = (user: User): UserFormValues => ({
  name: user.name,
  email: user.email,
  password: '',
  role: user.role,
  isActive: user.isActive,
});

export const userFormValidation = (isEditing: boolean) => ({
  name: (value: string) => (value.trim() === '' ? 'Nome é obrigatório' : null),
  email: (value: string) =>
    /^\S+@\S+\.\S+$/.test(value.trim()) ? null : 'Informe um e-mail válido',
  password: (value: string) => (isEditing ? null : validatePassword(value)),
  role: (value: UserRole | null) => (value ? null : 'Papel é obrigatório'),
});

export function buildCreatePayload(values: UserFormValues): CreateUserInput {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    role: values.role!,
    isActive: values.isActive,
  };
}

export function buildUpdatePayload(values: UserFormValues): UpdateUserInput {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role!,
    isActive: values.isActive,
  };
}
