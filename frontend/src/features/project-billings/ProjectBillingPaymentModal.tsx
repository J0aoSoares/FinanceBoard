import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { BankSelect } from '../../components/fields/BankSelect';
import { DateField } from '../../components/fields/DateField';
import { MoneyText } from '../../components/display/MoneyText';
import { useRegisterProjectBillingPayment } from '../../hooks/use-project-billings';
import { todayIsoDate } from '../../lib/date';
import { compareMoney } from '../../lib/money';
import type { ProjectBilling } from '../../api/types';

interface ProjectBillingPaymentModalProps {
  billing: ProjectBilling;
  onClose: () => void;
}

export function ProjectBillingPaymentModal({
  billing,
  onClose,
}: ProjectBillingPaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<string | null>(todayIsoDate());
  const [bankId, setBankId] = useState<string | null>(null);
  const registerPayment = useRegisterProjectBillingPayment();

  const dateError = !paymentDate
    ? 'Informe a data do pagamento'
    : paymentDate > todayIsoDate()
      ? 'Data de pagamento não pode ser futura'
      : null;
  const hasRetainage = compareMoney(billing.retainageAmount, '0.00') > 0;

  const submit = () => {
    if (dateError || !paymentDate || !bankId) {
      return;
    }
    registerPayment.mutate(
      { id: billing.id, paymentDate, bankId },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Registrar pagamento" centered>
      <Stack gap="md">
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            Fatura {billing.number} — {billing.project.name}
          </Text>
          <Text size="xs" c="dimmed">
            {hasRetainage
              ? 'Valor líquido esperado (valor da fatura menos a caução)'
              : 'Valor esperado'}
          </Text>
          <MoneyText
            value={billing.netAmount}
            tone="inflow"
            strong
            withSymbol
          />
          {hasRetainage && (
            <Text size="xs" c="dimmed">
              Caução de <MoneyText value={billing.retainageAmount} withSymbol />{' '}
              fica retida pela obra e é devolvida depois.
            </Text>
          )}
        </Stack>

        <DateField
          label="Data do pagamento"
          withAsterisk
          clearable={false}
          value={paymentDate}
          onChange={setPaymentDate}
          error={dateError}
        />
        <BankSelect
          withAsterisk
          clearable={false}
          description="Banco em que o valor foi recebido"
          value={bankId}
          onChange={setBankId}
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="default"
            onClick={onClose}
            disabled={registerPayment.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={registerPayment.isPending}
            disabled={Boolean(dateError) || !bankId}
          >
            Confirmar pagamento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
