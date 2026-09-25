import { Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { useInvoices } from '../../hooks/use-invoices';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { useAuth } from '../../auth/use-auth';
import { formatMonth } from '../../lib/date';
import type { InvoiceFilters } from '../../api/types';
import { InvoiceFormModal } from './InvoiceFormModal';
import { InvoicesFilters } from './InvoicesFilters';
import { InvoicesTable } from './InvoicesTable';

export function InvoicesPage() {
  const { global, screen, globalSearch } = useGlobalFilters();
  const { canWrite } = useAuth();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const filters: InvoiceFilters = {
    ...global,
    supplierId: screen.supplierId,
    status: screen.status,
  };
  const { data, isLoading, isError, error, isFetching } = useInvoices(filters);

  const emptyMessage =
    global.regime === 'cash'
      ? 'Nenhuma fatura paga nesta competência. No regime de caixa a fatura entra pelo mês do pagamento, então faturas ainda em aberto não aparecem — alterne para competência para vê-las.'
      : 'Nenhuma fatura encontrada para os filtros selecionados.';

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          {formatMonth(global.month)} ·{' '}
          {global.regime === 'accrual'
            ? 'por competência (vencimento da fatura)'
            : 'por caixa (pagamento da fatura)'}
          {global.companyId ? '' : ' · consolidado'}
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreating(true)}
          >
            Nova fatura
          </Button>
        )}
      </Group>

      <InvoicesFilters />

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar as faturas"
      >
        <Stack gap="xs">
          <InvoicesTable
            invoices={data ?? []}
            search={globalSearch}
            emptyMessage={emptyMessage}
          />
          {isFetching && (
            <Text size="xs" c="dimmed">
              Atualizando…
            </Text>
          )}
        </Stack>
      </QueryBoundary>

      {creating && (
        <InvoiceFormModal
          key="new"
          invoice={null}
          defaultCompanyId={global.companyId}
          onCreated={(invoice) =>
            navigate({
              pathname: `/invoices/${invoice.id}`,
              search: globalSearch,
            })
          }
          onClose={() => setCreating(false)}
        />
      )}
    </Stack>
  );
}
