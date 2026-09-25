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
import { useState } from 'react';
import { CompanySelect } from '../../components/fields/CompanySelect';
import { DateField } from '../../components/fields/DateField';
import { SupplierSelect } from '../../components/fields/SupplierSelect';
import { useCreateInvoice, useUpdateInvoice } from '../../hooks/use-invoices';
import type { Invoice } from '../../api/types';
import { BillPicker } from './BillPicker';
import {
  buildCreatePayload,
  buildDetailsPayload,
  emptyInvoiceForm,
  invoiceFormValidation,
  invoiceToFormValues,
  type InvoiceFormValues,
} from './invoice-form';

interface InvoiceFormModalProps {
  invoice: Invoice | null;
  defaultCompanyId?: string;
  onCreated?: (invoice: Invoice) => void;
  onClose: () => void;
}

export function InvoiceFormModal({
  invoice,
  defaultCompanyId,
  onCreated,
  onClose,
}: InvoiceFormModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const form = useForm<InvoiceFormValues>({
    mode: 'controlled',
    initialValues: invoice
      ? invoiceToFormValues(invoice)
      : emptyInvoiceForm(defaultCompanyId),
    validate: invoiceFormValidation,
    validateInputOnBlur: true,
  });

  const isEditing = invoice !== null;
  const pending = createInvoice.isPending || updateInvoice.isPending;
  const companyId = form.getValues().companyId;

  const handleSubmit = (submitted: InvoiceFormValues) => {
    if (isEditing) {
      updateInvoice.mutate(
        { id: invoice.id, input: buildDetailsPayload(submitted) },
        { onSuccess: () => onClose() },
      );
      return;
    }

    createInvoice.mutate(buildCreatePayload(submitted, selectedIds), {
      onSuccess: (created) => {
        onCreated?.(created);
        onClose();
      },
    });
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar dados da fatura' : 'Nova fatura'}
      size={isEditing ? 'lg' : '90rem'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Número da fatura"
                placeholder="FAT-2026-014"
                withAsterisk
                {...form.getInputProps('number')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              {isEditing ? (
                <TextInput
                  label="Empresa"
                  readOnly
                  variant="filled"
                  description="Definida na criação e imutável"
                  value={invoice.company.legalName}
                />
              ) : (
                <CompanySelect
                  placeholder="Selecione a empresa"
                  withAsterisk
                  clearable={false}
                  description="Não poderá ser alterada depois"
                  {...form.getInputProps('companyId')}
                />
              )}
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DateField
                label="Vencimento"
                withAsterisk
                {...form.getInputProps('dueDate')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <SupplierSelect
                placeholder="Opcional"
                description="Vazio = fatura sem fornecedor definido"
                {...form.getInputProps('supplierId')}
              />
            </Grid.Col>
          </Grid>

          {!isEditing && (
            <>
              <Divider label="Contas da fatura" labelPosition="left" />

              {companyId ? (
                <BillPicker
                  companyId={companyId}
                  selectedIds={selectedIds}
                  onChange={setSelectedIds}
                />
              ) : (
                <Alert
                  color="blue"
                  variant="light"
                  icon={<IconInfoCircle size={18} />}
                >
                  Selecione a empresa para listar as contas disponíveis para
                  faturamento.
                </Alert>
              )}
            </>
          )}

          {isEditing && (
            <Text size="xs" c="dimmed">
              A composição da fatura é editada separadamente, pela ação
              &quot;Gerenciar composição&quot;.
            </Text>
          )}

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={!isEditing && selectedIds.length === 0}
            >
              {isEditing ? 'Salvar alterações' : 'Criar fatura'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
