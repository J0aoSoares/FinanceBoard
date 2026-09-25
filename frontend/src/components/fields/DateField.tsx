import { DateInput, type DateInputProps } from '@mantine/dates';
import {
  useState,
  type FocusEvent,
  type InputEvent,
  type KeyboardEvent,
} from 'react';
import {
  parseFormattedDate,
  parseTypedDate,
  type IsoDate,
} from '../../lib/date';

const INVALID_DATE_MESSAGE = 'Data inválida. Use dd/mm/aaaa';

export interface DateFieldProps extends Omit<
  DateInputProps,
  'value' | 'onChange' | 'dateParser' | 'fixOnBlur'
> {
  value?: IsoDate | null;
  onChange?: (value: IsoDate | null) => void;
}

export function DateField({
  value,
  onChange,
  onBlur,
  onKeyDown,
  onInput,
  error,
  ...props
}: DateFieldProps) {
  const [invalid, setInvalid] = useState(false);
  const current = value ?? null;

  const emit = (next: IsoDate | null) => {
    if (next !== current) {
      onChange?.(next);
    }
  };

  const commit = (text: string) => {
    if (text.trim() === '') {
      setInvalid(false);
      emit(null);
      return;
    }
    const parsed = parseTypedDate(text);
    setInvalid(parsed === null);
    emit(parsed);
  };

  const handleInput = (event: InputEvent<HTMLInputElement>) => {
    onInput?.(event);
    setInvalid(false);
    emit(null);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    commit(event.currentTarget.value);
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(event.currentTarget.value);
    }
    onKeyDown?.(event);
  };

  const handleChange = (next: string | null) => {
    setInvalid(false);
    onChange?.(next);
  };

  return (
    <DateInput
      valueFormat="DD/MM/YYYY"
      placeholder="dd/mm/aaaa"
      clearable
      {...props}
      value={current}
      onChange={handleChange}
      dateParser={parseFormattedDate}
      fixOnBlur={current !== null}
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      error={invalid ? INVALID_DATE_MESSAGE : error}
    />
  );
}
