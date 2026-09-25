import {
  Alert,
  Button,
  Checkbox,
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
import {
  useCreateBill,
  useCreateInstallments,
  useUpdateBill,
} from '../../hooks/use-bills';
import type { Bill } from '../../api/types';
import {
  billFormValidation,
  billToFormValues,
  buildCreatePayload,
  buildInstallmentRows,
  buildInstallmentsPayload,
  buildUpdatePayload,
  emptyBillForm,
  hasLegacyWithholdings,
  redistributeAmounts,
  type BillFormValues,
  type InstallmentSettings,
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
  const createBill = useCreateBill();
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
  const invoiced = isEditing && bill.invoice !== null;
  const legacy = hasLegacyWithholdings(bill);
  const pending =
    createBill.isPending ||
    createInstallments.isPending ||
    updateBill.isPending;

  const regenerate = (
    settings: InstallmentSettings,
    total = form.getValues().amount,
  ) => {
    form.setFieldValue(
      'installments',
      buildInstallmentRows(settings, total, form.getValues().installments),
    );
  };

  const updateSettings = (patch: Partial<InstallmentSettings>) => {
    const settings = { ...form.getValues().settings, ...patch };
    form.setFieldValue('settings', settings);
    regenerate(settings);
  };

  const toggleSplit = (split: boolean) => {
    form.setFieldValue('split', split);
    if (!split) {
      return;
    }
    const current = form.getValues();
    const settings = {
      ...current.settings,
      firstDueDate: current.settings.firstDueDate ?? current.dueDate,
    };
    form.setFieldValue('settings', settings);
    regenerate(settings);
  };

  const amountProps = form.getInputProps('amount');
  const changeAmount = (next: string) => {
    amountProps.onChange(next);
    if (form.getValues().split) {
      form.setFieldValue(
        'installments',
        redistributeAmounts(form.getValues().installments, next),
      );
    }
  };

  const handleSubmit = (submitted: BillFormValues) => {
    const onSuccess = () => onClose();

    if (isEditing) {
      updateBill.mutate(
        { id: bill.id, input: buildUpdatePayload(submitted) },
        { onSuccess },
      );
    } else if (submitted.split) {
      createInstallments.mutate(buildInstallmentsPayload(submitted), {
        onSuccess,
      });
    } else {
      createBill.mutate(buildCreatePayload(submitted), { onSuccess });
    }
  };

  const title = isEditing
    ? bill.installmentLabel
      ? `Editar boleto ${bill.installmentLabel}`
      : 'Editar boleto'
    : 'Novo boleto';

  return (
    <Modal
      opened
      onClose={onClose}
      title={title}
      size={values.split ? 'xl' : 'lg'}
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
              Este boleto pertence à fatura {bill.invoice?.number}. A empresa só
              pode ser trocada removendo-o da fatura.
            </Alert>
          )}
          {legacy && (
            <Alert
              color="yellow"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Esta conta tem retenções do modelo anterior; o valor não pode ser
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
                disabled={invoiced}
                {...form.getInputProps('companyId')}
              />
            </Grid.Col>

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

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateField
                label="Data da compra"
                withAsterisk
                {...form.getInputProps('issueDate')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MoneyInput
                label={values.split ? 'Valor total' : 'Valor'}
                withAsterisk
                disabled={legacy}
                {...amountProps}
                onChange={changeAmount}
              />
            </Grid.Col>

            {!values.split && (
              <>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <DateField
                    label="Vencimento"
                    withAsterisk
                    {...form.getInputProps('dueDate')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Linha digitável"
                    description="Opcional. Pode colar com espaços e pontos."
                    placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
                    classNames={{ input: 'fb-numeric' }}
                    {...form.getInputProps('digitableLine')}
                  />
                </Grid.Col>
              </>
            )}
          </Grid>

          {!isEditing && (
            <>
              <Divider />
              <Checkbox
                label="Dividir em boletos"
                description="Cadastra de uma vez uma compra paga em vários boletos"
                checked={values.split}
                onChange={(event) => toggleSplit(event.currentTarget.checked)}
              />
              {values.split && (
                <InstallmentsEditor
                  form={form}
                  onSettingsChange={updateSettings}
                  onRedistribute={() => {
                    form.setFieldValue(
                      'installments',
                      redistributeAmounts(
                        form.getValues().installments,
                        form.getValues().amount,
                      ),
                    );
                    form.validateField('amount');
                  }}
                />
              )}
            </>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing
                ? 'Salvar alterações'
                : values.split
                  ? `Cadastrar ${values.installments.length} boletos`
                  : 'Cadastrar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
