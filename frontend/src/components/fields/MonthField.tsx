import { MonthPickerInput, type MonthPickerInputProps } from '@mantine/dates';
import {
  monthToPickerValue,
  pickerValueToMonth,
  type Month,
} from '../../lib/date';

export interface MonthFieldProps extends Omit<
  MonthPickerInputProps,
  'value' | 'onChange' | 'type'
> {
  value?: Month | null;
  onChange?: (value: Month | null) => void;
}

export function MonthField({ value, onChange, ...props }: MonthFieldProps) {
  return (
    <MonthPickerInput
      valueFormat="MMMM [de] YYYY"
      placeholder="Selecione a competência"
      value={value ? monthToPickerValue(value) : null}
      onChange={(next) => onChange?.(next ? pickerValueToMonth(next) : null)}
      {...props}
    />
  );
}
