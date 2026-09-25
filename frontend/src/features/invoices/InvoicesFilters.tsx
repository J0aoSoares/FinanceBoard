import { Button, Group, Select } from '@mantine/core';
import { IconFilterOff } from '@tabler/icons-react';
import { SupplierSelect } from '../../components/fields/SupplierSelect';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { STATUS_LABELS, type EffectiveStatus } from '../../api/types';

const statusOptions = (Object.keys(STATUS_LABELS) as EffectiveStatus[]).map(
  (status) => ({ value: status, label: STATUS_LABELS[status] }),
);

export function InvoicesFilters() {
  const { screen, setFilter, clearScreenFilters } = useGlobalFilters();
  const hasFilters = Boolean(screen.supplierId || screen.status);

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <SupplierSelect
        size="xs"
        w={220}
        placeholder="Todos os fornecedores"
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
      {hasFilters && (
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
