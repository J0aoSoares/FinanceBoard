import { Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { ReceivablesFilters } from './ReceivablesFilters';
import { ReceivablesTable } from './ReceivablesTable';
import { useReceivableDialogs } from './use-receivable-dialogs';
import { useReceivables } from '../../hooks/use-receivables';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { useAuth } from '../../auth/use-auth';
import { formatMonth } from '../../lib/date';
import type { ReceivableFilters } from '../../api/types';

export function ReceivablesPage() {
  const { global, screen } = useGlobalFilters();
  const { canWrite } = useAuth();
  const { openNew, tableHandlers, dialogs } = useReceivableDialogs({
    defaultCompanyId: global.companyId,
  });

  const filters: ReceivableFilters = {
    companyId: global.companyId,
    month: global.month,
    dateBasis: 'competence',
    projectId: screen.projectId,
    status: screen.status,
  };
  const { data, isLoading, isError, error, isFetching } =
    useReceivables(filters);

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Notas de serviço · competência {formatMonth(global.month)}
          {global.companyId ? '' : ' · consolidado'}
        </Text>
        {canWrite && (
          <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
            Nova nota de serviço
          </Button>
        )}
      </Group>

      <ReceivablesFilters />

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar as notas de serviço"
      >
        <Stack gap="xs">
          <ReceivablesTable receivables={data ?? []} {...tableHandlers} />
          {isFetching && (
            <Text size="xs" c="dimmed">
              Atualizando…
            </Text>
          )}
        </Stack>
      </QueryBoundary>

      {dialogs}
    </Stack>
  );
}
