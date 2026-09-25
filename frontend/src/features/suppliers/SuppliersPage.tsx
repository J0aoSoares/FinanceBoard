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
import { SupplierFormModal } from './SupplierFormModal';
import { useDeleteSupplier, useSuppliers } from '../../hooks/use-catalog';
import { documentKind, formatDocument } from '../../lib/document';
import type { Supplier } from '../../api/types';

type FormState = { open: false } | { open: true; supplier: Supplier | null };

export function SuppliersPage() {
  const [formState, setFormState] = useState<FormState>({ open: false });
  const { canWrite } = useAuth();
  const { data, isLoading, isError, error } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();

  const suppliers = data ?? [];

  const confirmDelete = (supplier: Supplier) =>
    modals.openConfirmModal({
      title: 'Excluir fornecedor',
      centered: true,
      children: (
        <Text size="sm">
          O fornecedor <strong>{supplier.name}</strong> será removido. Se houver
          contas ou faturas vinculadas, a API vai recusar a exclusão.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteSupplier.mutate(supplier.id),
    });

  const columns: DataTableColumn<Supplier>[] = [
    { key: 'name', header: 'Nome', render: (supplier) => supplier.name },
    {
      key: 'document',
      header: 'CPF / CNPJ',
      render: (supplier) =>
        supplier.document ? (
          <span className="fb-numeric">
            {formatDocument(supplier.document)}
          </span>
        ) : (
          <Text component="span" size="sm" c="dimmed">
            Não informado
          </Text>
        ),
    },
    {
      key: 'kind',
      header: 'Tipo',
      render: (supplier) => (
        <Text component="span" size="sm" c="dimmed">
          {supplier.document ? (documentKind(supplier.document) ?? '—') : '—'}
        </Text>
      ),
    },
  ];

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Fornecedores usados nas contas a pagar e nas faturas. O documento é
          opcional.
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, supplier: null })}
          >
            Novo fornecedor
          </Button>
        )}
      </Group>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar os fornecedores"
      >
        <DataTable
          columns={columns}
          items={suppliers}
          rowKey={(supplier) => supplier.id}
          emptyMessage="Nenhum fornecedor cadastrado."
          renderActions={
            canWrite
              ? (supplier) => (
                  <RowActions
                    label={`Ações de ${supplier.name}`}
                    onEdit={() => setFormState({ open: true, supplier })}
                    onDelete={() => confirmDelete(supplier)}
                  />
                )
              : undefined
          }
          footer={`${suppliers.length} ${
            suppliers.length === 1 ? 'fornecedor' : 'fornecedores'
          }`}
        />
      </QueryBoundary>

      {formState.open && (
        <SupplierFormModal
          key={formState.supplier?.id ?? 'new'}
          supplier={formState.supplier}
          onClose={() => setFormState({ open: false })}
        />
      )}
    </Stack>
  );
}
