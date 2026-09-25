import { Alert, Button, Group, Modal, Stack } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useUpdateInvoice } from '../../hooks/use-invoices';
import type { Invoice } from '../../api/types';
import { BillPicker } from './BillPicker';
import { buildCompositionPayload } from './invoice-composition';

interface InvoiceCompositionModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoiceCompositionModal({
  invoice,
  onClose,
}: InvoiceCompositionModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    invoice.bills.map((bill) => bill.id),
  );
  const updateInvoice = useUpdateInvoice();

  const submit = () =>
    updateInvoice.mutate(
      { id: invoice.id, input: buildCompositionPayload(selectedIds) },
      { onSuccess: () => onClose() },
    );

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Composição da fatura ${invoice.number}`}
      size="90rem"
      centered
    >
      <Stack gap="md">
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
          A composição é salva por inteiro: as contas marcadas passam a ser
          exatamente as contas da fatura, e as desmarcadas voltam a ficar
          disponíveis.
        </Alert>

        <BillPicker
          companyId={invoice.companyId}
          invoiceId={invoice.id}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="default"
            onClick={onClose}
            disabled={updateInvoice.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={updateInvoice.isPending}
            disabled={selectedIds.length === 0}
          >
            Salvar composição
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
