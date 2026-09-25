export const PASSWORD_MIN_LENGTH = 10;

const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).+$/u;

export const PASSWORD_MESSAGE =
  'Senha deve ter ao menos 10 caracteres, incluindo pelo menos uma letra e um número';

export function validatePassword(value: string): string | null {
  return value.length >= PASSWORD_MIN_LENGTH && PASSWORD_PATTERN.test(value)
    ? null
    : PASSWORD_MESSAGE;
}
