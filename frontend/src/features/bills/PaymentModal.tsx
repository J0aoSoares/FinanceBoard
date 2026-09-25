import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { DateField } from '../../components/fields/DateField';
import { MoneyText } from '../../components/display/MoneyText';
import { usePayBill } from '../../hooks/use-bills';
import { todayIsoDate } from '../../lib/date';
import type { Bill } from '../../api/types';

interface PaymentModalProps {
  bill: Bill;
  onClose: () => void;
}

export function PaymentModal({ bill, onClose }: PaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<string | null>(todayIsoDate());
  const payBill = usePayBill();

  const submit = () => {
    if (!paymentDate) {
      return;
    }
    payBill.mutate(
      { id: bill.id, paymentDate },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Registrar pagamento" centered>
      <Stack gap="md">
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {bill.documentNumber} — {bill.supplier.name}
          </Text>
          <Text size="xs" c="dimmed">
            Valor líquido a pagar
          </Text>
          <MoneyText value={bill.netAmount} strong withSymbol />
        </Stack>

        <DateField
          label="Data do pagamento"
          withAsterisk
          clearable={false}
          value={paymentDate}
          onChange={setPaymentDate}
          error={paymentDate ? null : 'Informe a data do pagamento'}
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="default"
            onClick={onClose}
            disabled={payBill.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={payBill.isPending}
            disabled={!paymentDate}
          >
            Confirmar pagamento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
