import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { DocumentField } from '../../components/fields/DocumentField';
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/use-catalog';
import { isDocument } from '../../lib/document';
import type {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
} from '../../api/types';

interface SupplierFormModalProps {
  supplier: Supplier | null;
  onClose: () => void;
}

interface SupplierFormValues {
  name: string;
  document: string;
}

export function SupplierFormModal({
  supplier,
  onClose,
}: SupplierFormModalProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const form = useForm<SupplierFormValues>({
    mode: 'controlled',
    initialValues: {
      name: supplier?.name ?? '',
      document: supplier?.document ?? '',
    },
    validate: {
      name: (value) =>
        value.trim() === '' ? 'Nome do fornecedor é obrigatório' : null,
      document: (value) =>
        value === '' || isDocument(value)
          ? null
          : 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)',
    },
    validateInputOnBlur: true,
  });

  const isEditing = supplier !== null;
  const pending = createSupplier.isPending || updateSupplier.isPending;

  const handleSubmit = (submitted: SupplierFormValues) => {
    const name = submitted.name.trim();
    const onSuccess = () => onClose();

    if (isEditing) {
      const input: UpdateSupplierInput = {
        name,
        document: submitted.document === '' ? null : submitted.document,
      };
      updateSupplier.mutate({ id: supplier.id, input }, { onSuccess });
      return;
    }

    const input: CreateSupplierInput = { name };
    if (submitted.document !== '') {
      input.document = submitted.document;
    }
    createSupplier.mutate(input, { onSuccess });
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar fornecedor' : 'Novo fornecedor'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Auto Peças Diesel"
            withAsterisk
            data-autofocus
            {...form.getInputProps('name')}
          />

          <DocumentField
            label="CPF ou CNPJ"
            placeholder="Opcional"
            description="Somente números; deixe vazio se não houver documento"
            maxDigits={14}
            {...form.getInputProps('document')}
          />

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
