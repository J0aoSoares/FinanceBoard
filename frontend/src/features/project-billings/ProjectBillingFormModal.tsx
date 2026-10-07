import {
  Alert,
  Button,
  Checkbox,
  Grid,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { BankSelect } from '../../components/fields/BankSelect';
import { CompanySelect } from '../../components/fields/CompanySelect';
import { DateField } from '../../components/fields/DateField';
import { MoneyInput } from '../../components/fields/MoneyInput';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import { MoneyText } from '../../components/display/MoneyText';
import {
  useCreateProjectBilling,
  useUpdateProjectBilling,
} from '../../hooks/use-project-billings';
import { todayIsoDate } from '../../lib/date';
import type { ProjectBilling } from '../../api/types';
import {
  buildCreatePayload,
  buildUpdatePayload,
  emptyProjectBillingForm,
  previewNet,
  previewRetainage,
  projectBillingFormValidation,
  projectBillingToFormValues,
  projectCreationBlockedReason,
  type ProjectBillingFormValues,
  type RetainageMode,
} from './project-billing-form';

interface ProjectBillingFormModalProps {
  billing: ProjectBilling | null;
  defaultCompanyId?: string;
  defaultProjectId?: string;
  onClose: () => void;
}

export function ProjectBillingFormModal({
  billing,
  defaultCompanyId,
  defaultProjectId,
  onClose,
}: ProjectBillingFormModalProps) {
  const createBilling = useCreateProjectBilling();
  const updateBilling = useUpdateProjectBilling();

  const form = useForm<ProjectBillingFormValues>({
    mode: 'controlled',
    initialValues: billing
      ? projectBillingToFormValues(billing)
      : emptyProjectBillingForm(defaultCompanyId, defaultProjectId),
    validate: projectBillingFormValidation,
    validateInputOnBlur: true,
  });

  const values = form.getValues();
  const isEditing = billing !== null;
  const amountLocked = isEditing && billing.paymentDate !== null;
  const pending = createBilling.isPending || updateBilling.isPending;
  const retainage = previewRetainage(values);
  const net = previewNet(values);

  const changeRetainageMode = (mode: RetainageMode) => {
    form.setFieldValue('retainageMode', mode);
    form.setFieldValue('retainage', '');
  };

  const togglePaid = (paid: boolean) => {
    form.setFieldValue('paid', paid);
    if (paid && !form.getValues().paymentDate) {
      form.setFieldValue('paymentDate', todayIsoDate());
    }
    if (!paid) {
      form.clearFieldError('paymentDate');
      form.clearFieldError('bankId');
    }
  };

  const handleSubmit = (submitted: ProjectBillingFormValues) => {
    const onSuccess = () => onClose();

    if (isEditing) {
      updateBilling.mutate(
        {
          id: billing.id,
          input: buildUpdatePayload(submitted, amountLocked),
        },
        { onSuccess },
      );
    } else {
      createBilling.mutate(buildCreatePayload(submitted), { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? `Editar fatura ${billing.number}` : 'Nova fatura'}
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {amountLocked && (
            <Alert
              color="blue"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Fatura paga: valor e caução não podem ser alterados. Para
              corrigi-los, estorne o pagamento antes.
            </Alert>
          )}

          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <TextInput
                label="Número da fatura"
                placeholder="FAT-0101"
                withAsterisk
                {...form.getInputProps('number')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <CompanySelect
                label="Empresa emissora"
                placeholder="Selecione a empresa"
                withAsterisk
                clearable={false}
                {...form.getInputProps('companyId')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: values.projectId ? 12 : 7 }}>
              <ProjectSelect
                creatable
                activeOnly
                withAsterisk
                clearable={false}
                placeholder="Digite ou selecione a obra"
                newProjectClientName={values.newProjectClientName}
                createDisabledReason={projectCreationBlockedReason(
                  values.newProjectClientName,
                )}
                {...form.getInputProps('projectId')}
              />
            </Grid.Col>
            {!values.projectId && (
              <Grid.Col span={{ base: 12, sm: 5 }}>
                <TextInput
                  label="Cliente da obra"
                  description="Obrigatório para cadastrar uma obra nova"
                  placeholder="Quem contratou a obra"
                  {...form.getInputProps('newProjectClientName')}
                />
              </Grid.Col>
            )}

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MoneyInput
                label="Valor da fatura"
                withAsterisk
                disabled={amountLocked}
                {...form.getInputProps('amount')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateField
                label="Vencimento"
                withAsterisk
                {...form.getInputProps('dueDate')}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <SegmentedControl
                  size="xs"
                  disabled={amountLocked}
                  value={values.retainageMode}
                  onChange={(mode) =>
                    changeRetainageMode(mode as RetainageMode)
                  }
                  data={[
                    { value: 'percent', label: '%' },
                    { value: 'amount', label: 'R$' },
                  ]}
                  mb={4}
                />
                {values.retainageMode === 'percent' ? (
                  <TextInput
                    style={{ flex: 1 }}
                    label="Caução (%)"
                    description="Opcional — parte retida pela obra e devolvida depois"
                    placeholder="Ex.: 5 ou 2,5"
                    disabled={amountLocked}
                    {...form.getInputProps('retainage')}
                  />
                ) : (
                  <MoneyInput
                    style={{ flex: 1 }}
                    label="Caução (R$)"
                    description="Opcional — parte retida pela obra e devolvida depois"
                    disabled={amountLocked}
                    {...form.getInputProps('retainage')}
                  />
                )}
              </Group>
            </Grid.Col>
          </Grid>

          <Group
            justify="space-between"
            align="center"
            bg="var(--fb-surface-sunken)"
            p="xs"
            style={{ borderRadius: 'var(--fb-radius-sm)' }}
          >
            <Text size="xs" c="dimmed">
              Caução <MoneyText value={retainage} withSymbol /> · líquido a
              receber — o valor definitivo é calculado pelo backend
            </Text>
            <MoneyText value={net} strong withSymbol tone="inflow" />
          </Group>

          {!isEditing && (
            <Stack gap="xs">
              <Checkbox
                label="Esta fatura já foi paga"
                description="Para lançar uma fatura antiga junto com o pagamento"
                checked={values.paid}
                onChange={(event) => togglePaid(event.currentTarget.checked)}
              />
              {values.paid && (
                <Grid gap="sm">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateField
                      label="Data do pagamento"
                      withAsterisk
                      clearable={false}
                      {...form.getInputProps('paymentDate')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <BankSelect
                      withAsterisk
                      clearable={false}
                      {...form.getInputProps('bankId')}
                    />
                  </Grid.Col>
                </Grid>
              )}
            </Stack>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing ? 'Salvar alterações' : 'Cadastrar fatura'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
