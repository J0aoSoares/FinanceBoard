import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import {
  useDeleteProjectBilling,
  useRemoveProjectBillingPayment,
} from '../../hooks/use-project-billings';
import type { ProjectBilling } from '../../api/types';
import { ProjectBillingFormModal } from './ProjectBillingFormModal';
import { ProjectBillingPaymentModal } from './ProjectBillingPaymentModal';
import type { ProjectBillingTableHandlers } from './ProjectBillingsTable';

type FormState =
  { open: false } | { open: true; billing: ProjectBilling | null };

interface ProjectBillingDialogsOptions {
  defaultCompanyId?: string;
  defaultProjectId?: string;
}

export function useProjectBillingDialogs({
  defaultCompanyId,
  defaultProjectId,
}: ProjectBillingDialogsOptions) {
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [payingItem, setPayingItem] = useState<ProjectBilling | null>(null);
  const removePayment = useRemoveProjectBillingPayment();
  const deleteBilling = useDeleteProjectBilling();

  const confirmReverse = (billing: ProjectBilling) =>
    modals.openConfirmModal({
      title: 'Estornar pagamento',
      centered: true,
      children: (
        <Text size="sm">
          O pagamento da <strong>fatura {billing.number}</strong> será desfeito:
          a data e o banco serão apagados e a fatura voltará para pendente.
        </Text>
      ),
      labels: { confirm: 'Estornar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => removePayment.mutate(billing.id),
    });

  const confirmDelete = (billing: ProjectBilling) =>
    modals.openConfirmModal({
      title: 'Excluir fatura',
      centered: true,
      children: (
        <Text size="sm">
          A <strong>fatura {billing.number}</strong> será removida
          definitivamente.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteBilling.mutate(billing.id),
    });

  const tableHandlers: ProjectBillingTableHandlers = {
    onPay: setPayingItem,
    onReverse: confirmReverse,
    onEdit: (billing) => setFormState({ open: true, billing }),
    onDelete: confirmDelete,
  };

  const dialogs = (
    <>
      {formState.open && (
        <ProjectBillingFormModal
          key={formState.billing?.id ?? 'new'}
          billing={formState.billing}
          defaultCompanyId={defaultCompanyId}
          defaultProjectId={defaultProjectId}
          onClose={() => setFormState({ open: false })}
        />
      )}
      {payingItem && (
        <ProjectBillingPaymentModal
          key={payingItem.id}
          billing={payingItem}
          onClose={() => setPayingItem(null)}
        />
      )}
    </>
  );

  return {
    openNew: () => setFormState({ open: true, billing: null }),
    tableHandlers,
    dialogs,
  };
}
