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
import { CompanyFormModal } from './CompanyFormModal';
import { useCompanies, useDeleteCompany } from '../../hooks/use-catalog';
import { formatCnpj } from '../../lib/document';
import type { Company } from '../../api/types';

type FormState = { open: false } | { open: true; company: Company | null };

export function CompaniesPage() {
  const [formState, setFormState] = useState<FormState>({ open: false });
  const { canWrite } = useAuth();
  const { data, isLoading, isError, error } = useCompanies();
  const deleteCompany = useDeleteCompany();

  const companies = data ?? [];

  const confirmDelete = (company: Company) =>
    modals.openConfirmModal({
      title: 'Excluir empresa',
      centered: true,
      children: (
        <Text size="sm">
          A empresa <strong>{company.legalName}</strong> será removida. Se
          houver contas, faturas ou recebíveis vinculados, a API vai recusar a
          exclusão.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteCompany.mutate(company.id),
    });

  const columns: DataTableColumn<Company>[] = [
    {
      key: 'legalName',
      header: 'Razão social',
      render: (company) => company.legalName,
    },
    {
      key: 'cnpj',
      header: 'CNPJ',
      render: (company) => (
        <span className="fb-numeric">{formatCnpj(company.cnpj)}</span>
      ),
    },
  ];

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Empresas do grupo. O CNPJ é único e não pode se repetir.
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, company: null })}
          >
            Nova empresa
          </Button>
        )}
      </Group>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar as empresas"
      >
        <DataTable
          columns={columns}
          items={companies}
          rowKey={(company) => company.id}
          emptyMessage="Nenhuma empresa cadastrada."
          renderActions={
            canWrite
              ? (company) => (
                  <RowActions
                    label={`Ações de ${company.legalName}`}
                    onEdit={() => setFormState({ open: true, company })}
                    onDelete={() => confirmDelete(company)}
                  />
                )
              : undefined
          }
          footer={`${companies.length} ${
            companies.length === 1 ? 'empresa' : 'empresas'
          }`}
        />
      </QueryBoundary>

      {formState.open && (
        <CompanyFormModal
          key={formState.company?.id ?? 'new'}
          company={formState.company}
          onClose={() => setFormState({ open: false })}
        />
      )}
    </Stack>
  );
}
