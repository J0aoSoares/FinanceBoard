import { Button, Group, Select } from '@mantine/core';
import { IconFilterOff } from '@tabler/icons-react';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { useClientNames } from '../../hooks/use-receivables';
import { STATUS_LABELS, type EffectiveStatus } from '../../api/types';

const statusOptions = (Object.keys(STATUS_LABELS) as EffectiveStatus[]).map(
  (status) => ({ value: status, label: STATUS_LABELS[status] }),
);

export function ReceivablesFilters() {
  const { global, screen, setFilter, clearScreenFilters } = useGlobalFilters();
  const clientNames = useClientNames(global.companyId);
  const hasFilters = Boolean(
    screen.projectId || screen.clientName || screen.status,
  );

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <ProjectSelect
        size="xs"
        w={220}
        placeholder="Todas as obras"
        value={screen.projectId ?? null}
        onChange={(value) => setFilter('projectId', value)}
      />
      <Select
        label="Tomador"
        size="xs"
        w={220}
        searchable
        clearable
        placeholder="Todos os tomadores"
        nothingFoundMessage="Nenhum tomador"
        data={clientNames.data ?? []}
        value={screen.clientName ?? null}
        onChange={(value) => setFilter('clientName', value)}
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
