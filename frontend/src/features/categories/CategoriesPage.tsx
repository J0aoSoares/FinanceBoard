import { Button, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import {
  DataTable,
  type DataTableColumn,
} from '../../components/display/DataTable';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { RowActions } from '../../components/RowActions';
import { useAuth } from '../../auth/use-auth';
import { CategoryFormModal } from './CategoryFormModal';
import { useCategories, useDeleteCategory } from '../../hooks/use-catalog';
import type { Category } from '../../api/types';

type FormState = { open: false } | { open: true; category: Category | null };

export function CategoriesPage() {
  const [formState, setFormState] = useState<FormState>({ open: false });
  const { canWrite } = useAuth();
  const { data, isLoading, isError, error } = useCategories();
  const deleteCategory = useDeleteCategory();

  const categories = data ?? [];

  const confirmDelete = (category: Category) =>
    modals.openConfirmModal({
      title: 'Excluir categoria',
      centered: true,
      children: (
        <Text size="sm">
          A categoria <strong>{category.name}</strong> será removida. Se houver
          contas classificadas nela, a API vai recusar a exclusão.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteCategory.mutate(category.id),
    });

  const columns: DataTableColumn<Category>[] = [
    { key: 'name', header: 'Nome', render: (category) => category.name },
  ];

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Categorias usadas para classificar as contas a pagar e o custo por
          obra.
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, category: null })}
          >
            Nova categoria
          </Button>
        )}
      </Group>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar as categorias"
      >
        <DataTable
          columns={columns}
          items={categories}
          rowKey={(category) => category.id}
          emptyMessage="Nenhuma categoria cadastrada."
          renderActions={
            canWrite
              ? (category) => (
                  <RowActions
                    label={`Ações de ${category.name}`}
                    onEdit={() => setFormState({ open: true, category })}
                    onDelete={() => confirmDelete(category)}
                  />
                )
              : undefined
          }
          footer={`${categories.length} ${
            categories.length === 1 ? 'categoria' : 'categorias'
          }`}
        />
      </QueryBoundary>

      {formState.open && (
        <CategoryFormModal
          key={formState.category?.id ?? 'new'}
          category={formState.category}
          onClose={() => setFormState({ open: false })}
        />
      )}
    </Stack>
  );
}
