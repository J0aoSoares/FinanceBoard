import { TextInput, type TextInputProps } from '@mantine/core';
import { useState } from 'react';
import { formatMoney, parseMoneyInput, type Money } from '../../lib/money';

export interface MoneyInputProps extends Omit<
  TextInputProps,
  'value' | 'onChange' | 'type'
> {
  value?: Money;
  onChange?: (value: Money) => void;
}

const toDisplay = (value: Money) => (value === '' ? '' : formatMoney(value));

export function MoneyInput({
  value = '',
  onChange,
  onBlur,
  ...props
}: MoneyInputProps) {
  const [display, setDisplay] = useState(() => toDisplay(value));
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if ((parseMoneyInput(display) ?? '') !== value) {
      setDisplay(toDisplay(value));
    }
  }

  return (
    <TextInput
      inputMode="decimal"
      placeholder="0,00"
      leftSection="R$"
      leftSectionWidth={40}
      classNames={{ input: 'fb-numeric' }}
      value={display}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        setDisplay(raw);
        const canonical = parseMoneyInput(raw) ?? '';
        setSyncedValue(canonical);
        onChange?.(canonical);
      }}
      onBlur={(event) => {
        const canonical = parseMoneyInput(display) ?? '';
        setDisplay(toDisplay(canonical));
        setSyncedValue(canonical);
        onChange?.(canonical);
        onBlur?.(event);
      }}
      {...props}
    />
  );
}
