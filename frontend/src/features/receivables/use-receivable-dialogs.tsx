import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import {
  useDeleteReceivable,
  useRemoveReceipt,
} from '../../hooks/use-receivables';
import type { Receivable } from '../../api/types';
import { ReceivableFormModal } from './ReceivableFormModal';
import { ReceiptModal } from './ReceiptModal';
import { receivableLabel } from './receivable-form';

type FormState =
  { open: false } | { open: true; receivable: Receivable | null };

interface ReceivableDialogsOptions {
  defaultCompanyId?: string;
  defaultProjectId?: string;
}

export function useReceivableDialogs({
  defaultCompanyId,
  defaultProjectId,
}: ReceivableDialogsOptions) {
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [receivingItem, setReceivingItem] = useState<Receivable | null>(null);
  const removeReceipt = useRemoveReceipt();
  const deleteReceivable = useDeleteReceivable();

  const confirmReverse = (receivable: Receivable) =>
    modals.openConfirmModal({
      title: 'Estornar recebimento',
      centered: true,
      children: (
        <Text size="sm">
          O recebimento da <strong>{receivableLabel(receivable)}</strong> será
          desfeito e a nota voltará para pendente.
        </Text>
      ),
      labels: { confirm: 'Estornar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => removeReceipt.mutate(receivable.id),
    });

  const confirmDelete = (receivable: Receivable) =>
    modals.openConfirmModal({
      title: 'Excluir nota de serviço',
      centered: true,
      children: (
        <Text size="sm">
          A <strong>{receivableLabel(receivable)}</strong> e suas retenções
          serão removidas definitivamente.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteReceivable.mutate(receivable.id),
    });

  const tableHandlers = {
    onReceive: setReceivingItem,
    onReverse: confirmReverse,
    onEdit: (receivable: Receivable) =>
      setFormState({ open: true, receivable }),
    onDelete: confirmDelete,
  };

  const dialogs = (
    <>
      {formState.open && (
        <ReceivableFormModal
          key={formState.receivable?.id ?? 'new'}
          receivable={formState.receivable}
          defaultCompanyId={defaultCompanyId}
          defaultProjectId={defaultProjectId}
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
    </>
  );

  return {
    openNew: () => setFormState({ open: true, receivable: null }),
    tableHandlers,
    dialogs,
  };
}
