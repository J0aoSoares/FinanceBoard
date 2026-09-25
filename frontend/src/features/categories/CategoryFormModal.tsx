import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useCreateCategory, useUpdateCategory } from '../../hooks/use-catalog';
import type { Category } from '../../api/types';

interface CategoryFormModalProps {
  category: Category | null;
  onClose: () => void;
}

interface CategoryFormValues {
  name: string;
}

export function CategoryFormModal({
  category,
  onClose,
}: CategoryFormModalProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const form = useForm<CategoryFormValues>({
    mode: 'controlled',
    initialValues: { name: category?.name ?? '' },
    validate: {
      name: (value) =>
        value.trim() === '' ? 'Nome da categoria é obrigatório' : null,
    },
    validateInputOnBlur: true,
  });

  const isEditing = category !== null;
  const pending = createCategory.isPending || updateCategory.isPending;

  const handleSubmit = (submitted: CategoryFormValues) => {
    const input = { name: submitted.name.trim() };
    const onSuccess = () => onClose();

    if (isEditing) {
      updateCategory.mutate({ id: category.id, input }, { onSuccess });
    } else {
      createCategory.mutate(input, { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar categoria' : 'Nova categoria'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Combustível"
            description="O nome é único entre as categorias"
            withAsterisk
            data-autofocus
            {...form.getInputProps('name')}
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
