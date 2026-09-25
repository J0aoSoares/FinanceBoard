import {
  Alert,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { BillsFilters } from './BillsFilters';
import { BillsTable } from './BillsTable';
import { BillFormModal } from './BillFormModal';
import { PaymentModal } from './PaymentModal';
import {
  useBills,
  useDeleteBill,
  useReversePayment,
} from '../../hooks/use-bills';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { useAuth } from '../../auth/use-auth';
import { ApiError } from '../../lib/http';
import { formatMonth } from '../../lib/date';
import type { Bill } from '../../api/types';

type FormState = { open: false } | { open: true; bill: Bill | null };

export function BillsPage() {
  const { global, screen } = useGlobalFilters();
  const { canWrite } = useAuth();
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  const filters = { ...global, ...screen };
  const { data, isLoading, isError, error, isFetching } = useBills(filters);

  const reversePayment = useReversePayment();
  const deleteBill = useDeleteBill();

  const confirmReverse = (bill: Bill) =>
    modals.openConfirmModal({
      title: 'Estornar pagamento',
      centered: true,
      children: (
        <Text size="sm">
          O pagamento de <strong>{bill.documentNumber}</strong> será desfeito e
          a conta voltará para pendente.
        </Text>
      ),
      labels: { confirm: 'Estornar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => reversePayment.mutate(bill.id),
    });

  const confirmDelete = (bill: Bill) =>
    modals.openConfirmModal({
      title: 'Excluir conta',
      centered: true,
      children: (
        <Text size="sm">
          A conta <strong>{bill.documentNumber}</strong> e suas retenções serão
          removidas definitivamente.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteBill.mutate(bill.id),
    });

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          {formatMonth(global.month)} ·{' '}
          {global.regime === 'accrual'
            ? 'por competência (emissão)'
            : 'por caixa (pagamento)'}
          {global.companyId ? '' : ' · consolidado'}
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, bill: null })}
          >
            Nova conta
          </Button>
        )}
      </Group>

      <BillsFilters />

      {isLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : isError ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Não foi possível carregar as contas"
        >
          {error instanceof ApiError
            ? error.messages.join(' ')
            : 'Erro inesperado'}
        </Alert>
      ) : (
        <Stack gap="xs">
          <BillsTable
            bills={data ?? []}
            onPay={setPayingBill}
            onReverse={confirmReverse}
            onEdit={(bill) => setFormState({ open: true, bill })}
            onDelete={confirmDelete}
          />
          {isFetching && (
            <Text size="xs" c="dimmed">
              Atualizando…
            </Text>
          )}
        </Stack>
      )}

      {formState.open && (
        <BillFormModal
          key={formState.bill?.id ?? 'new'}
          bill={formState.bill}
          defaultCompanyId={global.companyId}
          onClose={() => setFormState({ open: false })}
        />
      )}

      {payingBill && (
        <PaymentModal
          key={payingBill.id}
          bill={payingBill}
          onClose={() => setPayingBill(null)}
        />
      )}
    </Stack>
  );
}
