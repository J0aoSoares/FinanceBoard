import { Button, Grid, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { CompanySelect } from '../../components/fields/CompanySelect';
import { DateField } from '../../components/fields/DateField';
import { MoneyInput } from '../../components/fields/MoneyInput';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import {
  useCreateReceivable,
  useUpdateReceivable,
} from '../../hooks/use-receivables';
import type { Receivable } from '../../api/types';
import {
  buildCreatePayload,
  buildUpdatePayload,
  emptyReceivableForm,
  receivableFormValidation,
  receivableToFormValues,
  type ReceivableFormValues,
} from './receivable-form';

interface ReceivableFormModalProps {
  receivable: Receivable | null;
  defaultCompanyId?: string;
  onClose: () => void;
}

export function ReceivableFormModal({
  receivable,
  defaultCompanyId,
  onClose,
}: ReceivableFormModalProps) {
  const createReceivable = useCreateReceivable();
  const updateReceivable = useUpdateReceivable();

  const form = useForm<ReceivableFormValues>({
    mode: 'controlled',
    initialValues: receivable
      ? receivableToFormValues(receivable)
      : emptyReceivableForm(defaultCompanyId),
    validate: receivableFormValidation,
    validateInputOnBlur: true,
  });

  const isEditing = receivable !== null;
  const pending = createReceivable.isPending || updateReceivable.isPending;

  const handleSubmit = (submitted: ReceivableFormValues) => {
    const onSuccess = () => onClose();

    if (isEditing) {
      updateReceivable.mutate(
        { id: receivable.id, input: buildUpdatePayload(submitted) },
        { onSuccess },
      );
    } else {
      createReceivable.mutate(buildCreatePayload(submitted), { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar recebível' : 'Nova conta a receber'}
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <TextInput
                label="Descrição"
                placeholder="Medição 03"
                withAsterisk
                {...form.getInputProps('description')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <MoneyInput
                label="Valor"
                withAsterisk
                {...form.getInputProps('amount')}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                label="Cliente"
                placeholder="Nome do cliente"
                withAsterisk
                {...form.getInputProps('clientName')}
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
                {...form.getInputProps('companyId')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <ProjectSelect
                description="Vazio = receita sem obra"
                activeOnly
                {...form.getInputProps('projectId')}
              />
            </Grid.Col>
          </Grid>

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
