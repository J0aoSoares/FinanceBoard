import { Group } from '@mantine/core';
import { useMatch } from 'react-router-dom';
import { CompanySelect } from '../fields/CompanySelect';
import { RegimeToggle } from '../RegimeToggle';
import { useGlobalFilters } from '../../hooks/use-global-filters';

export function GlobalFilterBar() {
  const { global, setFilter } = useGlobalFilters();
  const onBills = useMatch('/bills') !== null;
  const onReceivables = useMatch('/receivables') !== null;

  return (
    <Group gap="sm" wrap="nowrap">
      <CompanySelect
        label={undefined}
        size="xs"
        w={260}
        value={global.companyId ?? null}
        onChange={(value) => setFilter('companyId', value)}
      />
      {!onBills && !onReceivables && (
        <RegimeToggle
          value={global.regime}
          onChange={(value) => setFilter('regime', value)}
        />
      )}
    </Group>
  );
}
