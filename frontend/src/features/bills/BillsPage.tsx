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
import { billLabel, nfLabel } from './bill-form';
import {
  useBills,
  useDeleteBill,
  useDeleteBillGroup,
  useReversePayment,
} from '../../hooks/use-bills';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { useAuth } from '../../auth/use-auth';
import { ApiError } from '../../lib/http';
import { formatMonth } from '../../lib/date';
import type { Bill, BillFilters, BillGroupSummary } from '../../api/types';

type FormState = { open: false } | { open: true; bill: Bill | null };

export function BillsPage() {
  const { global, screen } = useGlobalFilters();
  const { canWrite } = useAuth();
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  const filters: BillFilters = {
    companyId: global.companyId,
    month: global.month,
    dateBasis: 'due',
    projectId: screen.projectId,
    categoryId: screen.categoryId,
    supplierId: screen.supplierId,
    status: screen.status,
  };
  const { data, isLoading, isError, error, isFetching } = useBills(filters);

  const reversePayment = useReversePayment();
  const deleteBill = useDeleteBill();
  const deleteBillGroup = useDeleteBillGroup();

  const confirmReverse = (bill: Bill) =>
    modals.openConfirmModal({
      title: 'Estornar pagamento',
      centered: true,
      children: (
        <Text size="sm">
          O pagamento de <strong>{billLabel(bill)}</strong> será desfeito e o
          boleto voltará para pendente.
        </Text>
      ),
      labels: { confirm: 'Estornar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => reversePayment.mutate(bill.id),
    });

  const confirmDelete = (bill: Bill) =>
    modals.openConfirmModal({
      title: 'Excluir boleto',
      centered: true,
      children: (
        <Text size="sm">
          O boleto <strong>{billLabel(bill)}</strong> será removido
          definitivamente.
          {bill.group &&
            bill.group.billCount > 1 &&
            ` A NF tem ${bill.group.billCount} boletos; os demais continuam cadastrados.`}
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteBill.mutate(bill.id),
    });

  const confirmDeleteGroup = (group: BillGroupSummary, members: Bill[]) =>
    modals.openConfirmModal({
      title: 'Excluir NF',
      centered: true,
      children: (
        <Text size="sm">
          Os <strong>{group.billCount} boletos</strong> da{' '}
          <strong>{nfLabel(members[0].documentNumber)}</strong> serão removidos
          definitivamente, inclusive os que vencem em outros meses. NF com
          boleto pago não pode ser excluída.
        </Text>
      ),
      labels: { confirm: 'Excluir NF', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteBillGroup.mutate(group.id),
    });

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          {formatMonth(global.month)} · por vencimento
          {global.companyId ? '' : ' · consolidado'}
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, bill: null })}
          >
            Nova NF de boletos
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
          title="Não foi possível carregar os boletos"
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
            onDeleteGroup={confirmDeleteGroup}
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
