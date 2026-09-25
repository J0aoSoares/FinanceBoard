import { Group } from '@mantine/core';
import { CompanySelect } from '../fields/CompanySelect';
import { RegimeToggle } from '../RegimeToggle';
import { useGlobalFilters } from '../../hooks/use-global-filters';

export function GlobalFilterBar() {
  const { global, setFilter } = useGlobalFilters();

  return (
    <Group gap="sm" wrap="nowrap">
      <CompanySelect
        label={undefined}
        size="xs"
        w={260}
        value={global.companyId ?? null}
        onChange={(value) => setFilter('companyId', value)}
      />
      <RegimeToggle
        value={global.regime}
        onChange={(value) => setFilter('regime', value)}
      />
    </Group>
  );
}
