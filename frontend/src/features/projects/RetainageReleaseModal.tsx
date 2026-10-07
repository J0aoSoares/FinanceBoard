import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { BankSelect } from '../../components/fields/BankSelect';
import { DateField } from '../../components/fields/DateField';
import { MoneyInput } from '../../components/fields/MoneyInput';
import { MoneyText } from '../../components/display/MoneyText';
import { useCreateRetainageRelease } from '../../hooks/use-project-billings';
import { todayIsoDate } from '../../lib/date';
import { compareMoney, isCanonicalMoney } from '../../lib/money';
import type { ProjectRetainage } from '../../api/types';

interface RetainageReleaseModalProps {
  projectName: string;
  retainage: ProjectRetainage;
  onClose: () => void;
}

export function RetainageReleaseModal({
  projectName,
  retainage,
  onClose,
}: RetainageReleaseModalProps) {
  const withBalance = retainage.companies.filter(
    (company) => compareMoney(company.balance, '0.00') > 0,
  );
  const [companyId, setCompanyId] = useState<string | null>(
    withBalance.length === 1 ? withBalance[0].companyId : null,
  );
  const balanceOf = (id: string | null) =>
    withBalance.find((company) => company.companyId === id)?.balance ?? null;
  const [amount, setAmount] = useState(balanceOf(companyId) ?? '');
  const [returnDate, setReturnDate] = useState<string | null>(todayIsoDate());
  const [bankId, setBankId] = useState<string | null>(null);
  const createRelease = useCreateRetainageRelease();

  const balance = balanceOf(companyId);
  const amountError =
    amount === ''
      ? null
      : !isCanonicalMoney(amount) || compareMoney(amount, '0.00') <= 0
        ? 'Informe um valor maior que zero'
        : balance !== null && compareMoney(amount, balance) > 0
          ? 'Devolução maior que o saldo de caução retido'
          : null;
  const dateError = !returnDate
    ? 'Informe a data da devolução'
    : returnDate > todayIsoDate()
      ? 'Data da devolução não pode ser futura'
      : null;
  const invalid =
    !companyId ||
    amount === '' ||
    Boolean(amountError) ||
    Boolean(dateError) ||
    !bankId;

  const changeCompany = (next: string | null) => {
    setCompanyId(next);
    setAmount(balanceOf(next) ?? '');
  };

  const submit = () => {
    if (invalid || !companyId || !returnDate || !bankId) {
      return;
    }
    createRelease.mutate(
      {
        projectId: retainage.projectId,
        companyId,
        amount,
        returnDate,
        bankId,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title="Registrar devolução de caução"
      centered
    >
      <Stack gap="md">
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {projectName}
          </Text>
          <Text size="xs" c="dimmed">
            Saldo de caução a receber
          </Text>
          <MoneyText
            value={balance ?? retainage.balance}
            strong
            withSymbol
            tone="inflow"
          />
        </Stack>

        <Select
          label="Empresa"
          description="Empresa que emitiu as faturas com caução"
          withAsterisk
          data={withBalance.map((company) => ({
            value: company.companyId,
            label: company.legalName,
          }))}
          value={companyId}
          onChange={changeCompany}
        />
        <MoneyInput
          label="Valor devolvido"
          withAsterisk
          value={amount}
          onChange={setAmount}
          error={amountError}
        />
        <DateField
          label="Data da devolução"
          withAsterisk
          clearable={false}
          value={returnDate}
          onChange={setReturnDate}
          error={dateError}
        />
        <BankSelect
          withAsterisk
          clearable={false}
          description="Banco em que a devolução foi recebida"
          value={bankId}
          onChange={setBankId}
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="default"
            onClick={onClose}
            disabled={createRelease.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={createRelease.isPending}
            disabled={invalid}
          >
            Registrar devolução
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
