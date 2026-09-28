import {
  Alert,
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  Stack,
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
import { useCreateInstallments, useUpdateBill } from '../../hooks/use-bills';
import type { Bill } from '../../api/types';
import {
  billFormValidation,
  billLabel,
  billToFormValues,
  buildInstallmentsPayload,
  buildUpdatePayload,
  emptyBillForm,
  hasLegacyWithholdings,
  type BillFormValues,
} from './bill-form';
import { InstallmentsEditor } from './InstallmentsEditor';

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
  const createInstallments = useCreateInstallments();
  const updateBill = useUpdateBill();

  const form = useForm<BillFormValues>({
    mode: 'controlled',
    initialValues: bill
      ? billToFormValues(bill)
      : emptyBillForm(defaultCompanyId),
    validate: billFormValidation,
    validateInputOnBlur: true,
  });

  const values = form.getValues();
  const isEditing = bill !== null;
  const legacy = hasLegacyWithholdings(bill);
  const pending = createInstallments.isPending || updateBill.isPending;
  const count = values.installments.length;

  const handleSubmit = (submitted: BillFormValues) => {
    const onSuccess = () => onClose();

    if (isEditing) {
      updateBill.mutate(
        { id: bill.id, input: buildUpdatePayload(submitted) },
        { onSuccess },
      );
    } else {
      createInstallments.mutate(buildInstallmentsPayload(submitted), {
        onSuccess,
      });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? `Editar ${billLabel(bill)}` : 'Nova NF de boletos'}
      size="xl"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {isEditing && (bill.group?.billCount ?? 1) > 1 && (
            <Alert
              color="blue"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Este boleto faz parte de uma NF com {bill.group?.billCount}{' '}
              boletos. As alterações valem só para ele.
            </Alert>
          )}
          {legacy && (
            <Alert
              color="yellow"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Este boleto tem retenções do modelo anterior; o valor não pode ser
              alterado. Os demais campos podem ser editados.
            </Alert>
          )}

          <Grid gap="sm">
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
              <CompanySelect
                placeholder="Selecione a empresa"
                withAsterisk
                clearable={false}
                {...form.getInputProps('companyId')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Número da NF"
                placeholder="NF-1088"
                withAsterisk
                {...form.getInputProps('documentNumber')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DateField
                label="Emissão da NF"
                withAsterisk
                {...form.getInputProps('issueDate')}
              />
            </Grid.Col>
            {!isEditing && (
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <MoneyInput
                  label="Valor total da NF"
                  description="Opcional"
                  {...form.getInputProps('totalAmount')}
                />
              </Grid.Col>
            )}

            <Grid.Col span={12}>
              <TextInput
                label="Descrição"
                placeholder="Ex.: Diesel S10 - frota"
                withAsterisk
                {...form.getInputProps('description')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <CategorySelect
                creatable
                placeholder="Digite ou selecione a categoria"
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

          <InstallmentsEditor
            form={form}
            editing={isEditing}
            amountLocked={legacy}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing
                ? 'Salvar alterações'
                : count === 1
                  ? 'Cadastrar NF com 1 boleto'
                  : `Cadastrar NF com ${count} boletos`}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
