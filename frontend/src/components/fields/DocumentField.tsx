import { TextInput, type TextInputProps } from '@mantine/core';
import { useState } from 'react';
import { formatDocument, onlyDigits } from '../../lib/document';

export interface DocumentFieldProps extends Omit<
  TextInputProps,
  'value' | 'onChange' | 'type'
> {
  value?: string;
  onChange?: (value: string) => void;
  maxDigits?: number;
}

const toDisplay = (value: string) =>
  value === '' ? '' : formatDocument(value);

export function DocumentField({
  value = '',
  onChange,
  onBlur,
  maxDigits = 14,
  ...props
}: DocumentFieldProps) {
  const [display, setDisplay] = useState(() => toDisplay(value));
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if (onlyDigits(display) !== value) {
      setDisplay(toDisplay(value));
    }
  }

  return (
    <TextInput
      inputMode="numeric"
      classNames={{ input: 'fb-numeric' }}
      value={display}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        const digits = onlyDigits(raw);
        if (digits.length > maxDigits) {
          return;
        }
        setDisplay(raw);
        setSyncedValue(digits);
        onChange?.(digits);
      }}
      onBlur={(event) => {
        const digits = onlyDigits(display);
        setDisplay(toDisplay(digits));
        setSyncedValue(digits);
        onChange?.(digits);
        onBlur?.(event);
      }}
      {...props}
    />
  );
}
