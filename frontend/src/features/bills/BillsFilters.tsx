import { Button, Group, Select } from '@mantine/core';
import { IconFilterOff } from '@tabler/icons-react';
import { CategorySelect } from '../../components/fields/CategorySelect';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import { SupplierSelect } from '../../components/fields/SupplierSelect';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { STATUS_LABELS, type EffectiveStatus } from '../../api/types';

const statusOptions = (Object.keys(STATUS_LABELS) as EffectiveStatus[]).map(
  (status) => ({ value: status, label: STATUS_LABELS[status] }),
);

export function BillsFilters() {
  const { screen, setFilter, clearScreenFilters, hasScreenFilters } =
    useGlobalFilters();

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <ProjectSelect
        size="xs"
        w={220}
        placeholder="Todas as obras"
        value={screen.projectId ?? null}
        onChange={(value) => setFilter('projectId', value)}
      />
      <CategorySelect
        size="xs"
        w={190}
        value={screen.categoryId ?? null}
        onChange={(value) => setFilter('categoryId', value)}
      />
      <SupplierSelect
        size="xs"
        w={210}
        value={screen.supplierId ?? null}
        onChange={(value) => setFilter('supplierId', value)}
      />
      <Select
        label="Situação"
        size="xs"
        w={150}
        clearable
        placeholder="Todas"
        data={statusOptions}
        value={screen.status ?? null}
        onChange={(value) => setFilter('status', value)}
      />
      {hasScreenFilters && (
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          leftSection={<IconFilterOff size={15} />}
          onClick={clearScreenFilters}
        >
          Limpar
        </Button>
      )}
    </Group>
  );
}
