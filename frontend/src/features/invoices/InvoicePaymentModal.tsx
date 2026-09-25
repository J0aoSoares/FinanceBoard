import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { DateField } from '../../components/fields/DateField';
import { MoneyText } from '../../components/display/MoneyText';
import { usePayInvoice } from '../../hooks/use-invoices';
import { todayIsoDate } from '../../lib/date';
import type { Invoice } from '../../api/types';

interface InvoicePaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoicePaymentModal({
  invoice,
  onClose,
}: InvoicePaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<string | null>(todayIsoDate());
  const payInvoice = usePayInvoice();

  const submit = () => {
    if (!paymentDate) {
      return;
    }
    payInvoice.mutate(
      { id: invoice.id, paymentDate },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Registrar pagamento" centered>
      <Stack gap="md">
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            Fatura {invoice.number} — {invoice.company.legalName}
          </Text>
          <Text size="xs" c="dimmed">
            Valor líquido a pagar
          </Text>
          <MoneyText
            value={invoice.netTotal}
            tone="outflow"
            strong
            withSymbol
          />
        </Stack>

        <Alert
          color="yellow"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
        >
          {invoice.billCount === 1
            ? 'A conta que compõe esta fatura também será marcada como paga, com a mesma data.'
            : `As ${invoice.billCount} contas que compõem esta fatura também serão marcadas como pagas, com a mesma data.`}
        </Alert>

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
            disabled={payInvoice.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={payInvoice.isPending}
            disabled={!paymentDate}
          >
            Confirmar pagamento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
