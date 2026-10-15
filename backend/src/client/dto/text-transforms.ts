export const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const optionalText = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }
  const text = value.trim();
  return text === '' ? null : text;
};
