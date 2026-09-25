import { SegmentedControl, Tooltip } from '@mantine/core';
import type { Regime } from '../api/types';

interface RegimeToggleProps {
  value: Regime;
  onChange: (value: Regime) => void;
}

export function RegimeToggle({ value, onChange }: RegimeToggleProps) {
  return (
    <Tooltip
      label="Competência usa a data de emissão; caixa usa a data de pagamento"
      multiline
      w={260}
      withArrow
    >
      <SegmentedControl
        size="xs"
        value={value}
        onChange={(next) => onChange(next as Regime)}
        data={[
          { label: 'Competência', value: 'accrual' },
          { label: 'Caixa', value: 'cash' },
        ]}
      />
    </Tooltip>
  );
}
