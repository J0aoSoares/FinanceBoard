import { Select, type SelectProps } from '@mantine/core';

export interface EntitySelectProps extends Omit<
  SelectProps,
  'data' | 'value' | 'onChange'
> {
  value?: string | null;
  onChange?: (value: string | null) => void;
}

interface BaseProps extends EntitySelectProps {
  options: { value: string; label: string }[];
  loading: boolean;
}

export function EntitySelect({
  options,
  loading,
  value,
  onChange,
  ...props
}: BaseProps) {
  return (
    <Select
      searchable
      clearable
      nothingFoundMessage="Nada encontrado"
      data={options}
      disabled={loading || props.disabled}
      value={value ?? null}
      onChange={(next) => onChange?.(next)}
      {...props}
    />
  );
}
