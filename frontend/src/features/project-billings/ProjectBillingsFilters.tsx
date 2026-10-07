import {
  Button,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { IconFilterOff } from '@tabler/icons-react';
import { BankSelect } from '../../components/fields/BankSelect';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import {
  PROJECT_BILLING_STATUS_LABELS,
  type EffectiveStatus,
} from '../../api/types';

const statusOptions = (
  Object.keys(PROJECT_BILLING_STATUS_LABELS) as EffectiveStatus[]
).map((status) => ({
  value: status,
  label: PROJECT_BILLING_STATUS_LABELS[status],
}));

export function ProjectBillingsFilters() {
  const { screen, setFilter, clearScreenFilters } = useGlobalFilters();
  const hasFilters = Boolean(
    screen.projectId || screen.bankId || screen.status || screen.dateBasis,
  );

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <Stack gap={4}>
        <Text size="xs" fw={500}>
          Mês por
        </Text>
        <SegmentedControl
          size="xs"
          value={screen.dateBasis ?? 'due'}
          onChange={(value) =>
            setFilter('dateBasis', value === 'due' ? null : value)
          }
          data={[
            { value: 'due', label: 'Vencimento' },
            { value: 'payment', label: 'Pagamento' },
          ]}
        />
      </Stack>
      <ProjectSelect
        size="xs"
        w={220}
        placeholder="Todas as obras"
        value={screen.projectId ?? null}
        onChange={(value) => setFilter('projectId', value)}
      />
      <BankSelect
        size="xs"
        w={190}
        placeholder="Todos os bancos"
        value={screen.bankId ?? null}
        onChange={(value) => setFilter('bankId', value)}
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
