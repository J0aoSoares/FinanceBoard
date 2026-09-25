import {
  Alert,
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { CategorySelect } from '../../components/fields/CategorySelect';
import { CompanySelect } from '../../components/fields/CompanySelect';
import { DateField } from '../../components/fields/DateField';
import { MoneyInput } from '../../components/fields/MoneyInput';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import { SupplierSelect } from '../../components/fields/SupplierSelect';
import { MoneyText } from '../../components/display/MoneyText';
import { useCreateBill, useUpdateBill } from '../../hooks/use-bills';
import type { Bill } from '../../api/types';
import {
  billFormValidation,
  billToFormValues,
  buildCreatePayload,
  buildUpdatePayload,
  emptyBillForm,
  previewNetAmount,
  type BillFormValues,
} from './bill-form';
import { WithholdingsField } from './WithholdingsField';

interface BillFormModalProps {
  bill: Bill | null;
  defaultCompanyId?: string;
  onClose: () => void;
}

export function BillFormModal({
  bill,
  defaultCompanyId,
  onClose,
}: BillFormModalProps) {
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();

  const form = useForm<BillFormValues>({
    mode: 'controlled',
    initialValues: bill
      ? billToFormValues(bill)
      : emptyBillForm(defaultCompanyId),
    validate: billFormValidation,
    validateInputOnBlur: true,
  });

  const preview = previewNetAmount(form.getValues());
  const isEditing = bill !== null;
  const invoiced = isEditing && bill.invoice !== null;
  const pending = createBill.isPending || updateBill.isPending;

  const handleSubmit = (submitted: BillFormValues) => {
    const onSuccess = () => onClose();

    if (isEditing) {
      updateBill.mutate(
        { id: bill.id, input: buildUpdatePayload(submitted) },
        { onSuccess },
      );
    } else {
      createBill.mutate(buildCreatePayload(submitted), { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar conta' : 'Nova conta a pagar'}
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {invoiced && (
            <Alert
              color="blue"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Esta conta pertence à fatura {bill.invoice?.number}. A empresa só
              pode ser trocada removendo a conta da fatura.
            </Alert>
          )}

          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <TextInput
                label="Número do documento"
                placeholder="NF-1088"
                withAsterisk
                {...form.getInputProps('documentNumber')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <MoneyInput
                label="Valor bruto"
                withAsterisk
                {...form.getInputProps('grossAmount')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateField
                label="Emissão"
                withAsterisk
                {...form.getInputProps('issueDate')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateField
                label="Vencimento"
                withAsterisk
                {...form.getInputProps('dueDate')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <CompanySelect
                placeholder="Selecione a empresa"
                withAsterisk
                clearable={false}
                disabled={invoiced}
                {...form.getInputProps('companyId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <SupplierSelect
                creatable
                placeholder="Digite ou selecione o fornecedor"
                withAsterisk
                clearable={false}
                {...form.getInputProps('supplierId')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <CategorySelect
                placeholder="Selecione a categoria"
                withAsterisk
                clearable={false}
                {...form.getInputProps('categoryId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <ProjectSelect
                description="Vazio = despesa administrativa"
                activeOnly
                {...form.getInputProps('projectId')}
              />
            </Grid.Col>
          </Grid>

          <Divider />

          <WithholdingsField form={form} />

          <Group
            justify="space-between"
            align="center"
            bg="var(--fb-surface-sunken)"
            p="xs"
            style={{ borderRadius: 'var(--fb-radius-sm)' }}
          >
            <Text size="xs" c="dimmed">
              Líquido previsto — o valor definitivo é calculado pelo backend
            </Text>
            <MoneyText value={preview} strong withSymbol />
          </Group>

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
