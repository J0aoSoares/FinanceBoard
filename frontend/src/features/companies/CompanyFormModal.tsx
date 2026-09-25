import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { DocumentField } from '../../components/fields/DocumentField';
import { useCreateCompany, useUpdateCompany } from '../../hooks/use-catalog';
import { isCnpj } from '../../lib/document';
import type { Company } from '../../api/types';

interface CompanyFormModalProps {
  company: Company | null;
  onClose: () => void;
}

interface CompanyFormValues {
  legalName: string;
  cnpj: string;
}

export function CompanyFormModal({ company, onClose }: CompanyFormModalProps) {
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const form = useForm<CompanyFormValues>({
    mode: 'controlled',
    initialValues: company
      ? { legalName: company.legalName, cnpj: company.cnpj }
      : { legalName: '', cnpj: '' },
    validate: {
      legalName: (value) =>
        value.trim() === '' ? 'Razão social é obrigatória' : null,
      cnpj: (value) =>
        isCnpj(value) ? null : 'CNPJ deve conter 14 dígitos, sem pontuação',
    },
    validateInputOnBlur: true,
  });

  const isEditing = company !== null;
  const pending = createCompany.isPending || updateCompany.isPending;

  const handleSubmit = (submitted: CompanyFormValues) => {
    const input = {
      legalName: submitted.legalName.trim(),
      cnpj: submitted.cnpj,
    };
    const onSuccess = () => onClose();

    if (isEditing) {
      updateCompany.mutate({ id: company.id, input }, { onSuccess });
    } else {
      createCompany.mutate(input, { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar empresa' : 'Nova empresa'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Razão social"
            placeholder="Construtora Exemplo Ltda"
            withAsterisk
            data-autofocus
            {...form.getInputProps('legalName')}
          />

          <DocumentField
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            description="Somente números; a pontuação é aplicada na exibição"
            withAsterisk
            maxDigits={14}
            {...form.getInputProps('cnpj')}
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
