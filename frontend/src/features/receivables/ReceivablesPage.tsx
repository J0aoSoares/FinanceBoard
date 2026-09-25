import { Button, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { ReceivableFormModal } from './ReceivableFormModal';
import { ReceivablesFilters } from './ReceivablesFilters';
import { ReceivablesTable } from './ReceivablesTable';
import { ReceiptModal } from './ReceiptModal';
import {
  useDeleteReceivable,
  useReceivables,
  useRemoveReceipt,
} from '../../hooks/use-receivables';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { useAuth } from '../../auth/use-auth';
import { formatMonth } from '../../lib/date';
import type { Receivable, ReceivableFilters } from '../../api/types';

type FormState =
  { open: false } | { open: true; receivable: Receivable | null };

export function ReceivablesPage() {
  const { global, screen } = useGlobalFilters();
  const { canWrite } = useAuth();
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [receivingItem, setReceivingItem] = useState<Receivable | null>(null);

  const filters: ReceivableFilters = {
    ...global,
    projectId: screen.projectId,
    status: screen.status,
  };
  const { data, isLoading, isError, error, isFetching } =
    useReceivables(filters);

  const removeReceipt = useRemoveReceipt();
  const deleteReceivable = useDeleteReceivable();

  const confirmReverse = (receivable: Receivable) =>
    modals.openConfirmModal({
      title: 'Estornar recebimento',
      centered: true,
      children: (
        <Text size="sm">
          O recebimento de <strong>{receivable.description}</strong> será
          desfeito e o recebível voltará para pendente.
        </Text>
      ),
      labels: { confirm: 'Estornar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => removeReceipt.mutate(receivable.id),
    });

  const confirmDelete = (receivable: Receivable) =>
    modals.openConfirmModal({
      title: 'Excluir recebível',
      centered: true,
      children: (
        <Text size="sm">
          O recebível <strong>{receivable.description}</strong> será removido
          definitivamente.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteReceivable.mutate(receivable.id),
    });

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          {formatMonth(global.month)} ·{' '}
          {global.regime === 'accrual'
            ? 'por competência (emissão)'
            : 'por caixa (recebimento)'}
          {global.companyId ? '' : ' · consolidado'}
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, receivable: null })}
          >
            Nova conta a receber
          </Button>
        )}
      </Group>

      <ReceivablesFilters />

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar os recebíveis"
      >
        <Stack gap="xs">
          <ReceivablesTable
            receivables={data ?? []}
            onReceive={setReceivingItem}
            onReverse={confirmReverse}
            onEdit={(receivable) => setFormState({ open: true, receivable })}
            onDelete={confirmDelete}
          />
          {isFetching && (
            <Text size="xs" c="dimmed">
              Atualizando…
            </Text>
          )}
        </Stack>
      </QueryBoundary>

      {formState.open && (
        <ReceivableFormModal
          key={formState.receivable?.id ?? 'new'}
          receivable={formState.receivable}
          defaultCompanyId={global.companyId}
          onClose={() => setFormState({ open: false })}
        />
      )}

      {receivingItem && (
        <ReceiptModal
          key={receivingItem.id}
          receivable={receivingItem}
          onClose={() => setReceivingItem(null)}
        />
      )}
    </Stack>
  );
}
