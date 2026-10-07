import { Button, Group, Stack, Text } from '@mantine/core';
import { IconDownload, IconPlus } from '@tabler/icons-react';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { useAuth } from '../../auth/use-auth';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import {
  useProjectBillings,
  useProjectBillingTotals,
} from '../../hooks/use-project-billings';
import { downloadCsv } from '../../lib/csv';
import { formatMonth } from '../../lib/date';
import type { ProjectBillingFilters } from '../../api/types';
import { ProjectBillingsFilters } from './ProjectBillingsFilters';
import { ProjectBillingsTable } from './ProjectBillingsTable';
import { ProjectBillingTotalsPanel } from './ProjectBillingTotalsPanel';
import { projectBillingsCsvRows } from './project-billing-form';
import { useProjectBillingDialogs } from './use-project-billing-dialogs';

export function ProjectBillingsPage() {
  const { global, screen } = useGlobalFilters();
  const { canWrite } = useAuth();
  const { openNew, tableHandlers, dialogs } = useProjectBillingDialogs({
    defaultCompanyId: global.companyId,
  });

  const dateBasis = screen.dateBasis ?? 'due';
  const filters: ProjectBillingFilters = {
    companyId: global.companyId,
    month: global.month,
    dateBasis,
    projectId: screen.projectId,
    bankId: screen.bankId,
    status: screen.status,
  };
  const billings = useProjectBillings(filters);
  const totals = useProjectBillingTotals(filters);

  const exportCsv = () =>
    downloadCsv(
      `faturas_${global.month}_${dateBasis === 'payment' ? 'pagamento' : 'vencimento'}.csv`,
      projectBillingsCsvRows(billings.data ?? []),
    );

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Faturas · {dateBasis === 'payment' ? 'pagas em' : 'vencimento em'}{' '}
          {formatMonth(global.month)}
          {global.companyId ? '' : ' · consolidado'}
        </Text>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            disabled={!billings.data || billings.data.length === 0}
            onClick={exportCsv}
          >
            Exportar CSV
          </Button>
          {canWrite && (
            <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
              Nova fatura
            </Button>
          )}
        </Group>
      </Group>

      <ProjectBillingsFilters />

      <QueryBoundary
        isLoading={billings.isLoading}
        isError={billings.isError}
        error={billings.error}
        errorTitle="Não foi possível carregar as faturas"
      >
        <Stack gap="xs">
          <ProjectBillingsTable
            billings={billings.data ?? []}
            {...tableHandlers}
          />
          {billings.isFetching && (
            <Text size="xs" c="dimmed">
              Atualizando…
            </Text>
          )}
        </Stack>
      </QueryBoundary>

      <QueryBoundary
        isLoading={totals.isLoading}
        isError={totals.isError}
        error={totals.error}
        errorTitle="Não foi possível carregar os totais do período"
      >
        {totals.data && (
          <ProjectBillingTotalsPanel
            totals={totals.data}
            dateBasis={dateBasis}
          />
        )}
      </QueryBoundary>

      {dialogs}
    </Stack>
  );
}
