import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { DateField } from '../../components/fields/DateField';
import { MoneyText } from '../../components/display/MoneyText';
import { useRegisterReceipt } from '../../hooks/use-receivables';
import { todayIsoDate } from '../../lib/date';
import type { Receivable } from '../../api/types';

interface ReceiptModalProps {
  receivable: Receivable;
  onClose: () => void;
}

export function ReceiptModal({ receivable, onClose }: ReceiptModalProps) {
  const [receiptDate, setReceiptDate] = useState<string | null>(todayIsoDate());
  const registerReceipt = useRegisterReceipt();

  const submit = () => {
    if (!receiptDate) {
      return;
    }
    registerReceipt.mutate(
      { id: receivable.id, receiptDate },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Registrar recebimento" centered>
      <Stack gap="md">
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {receivable.description} — {receivable.clientName}
          </Text>
          <Text size="xs" c="dimmed">
            Valor a receber
          </Text>
          <MoneyText
            value={receivable.amount}
            tone="inflow"
            strong
            withSymbol
          />
        </Stack>

        <DateField
          label="Data do recebimento"
          withAsterisk
          clearable={false}
          value={receiptDate}
          onChange={setReceiptDate}
          error={receiptDate ? null : 'Informe a data do recebimento'}
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="default"
            onClick={onClose}
            disabled={registerReceipt.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={registerReceipt.isPending}
            disabled={!receiptDate}
          >
            Confirmar recebimento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
