import { Badge, Button, Group, Select, Stack, Text } from '@mantine/core';
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
import { ProjectFormModal } from './ProjectFormModal';
import { useDeleteProject, useProjects } from '../../hooks/use-catalog';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from '../../api/types';

type FormState = { open: false } | { open: true; project: Project | null };

const statusOptions = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: PROJECT_STATUS_LABELS[status],
}));

export function ProjectsPage() {
  const [formState, setFormState] = useState<FormState>({ open: false });
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);
  const { canWrite } = useAuth();
  const { data, isLoading, isError, error } = useProjects();
  const deleteProject = useDeleteProject();

  const projects = (data ?? []).filter(
    (project) => !statusFilter || project.status === statusFilter,
  );

  const confirmDelete = (project: Project) =>
    modals.openConfirmModal({
      title: 'Excluir obra',
      centered: true,
      children: (
        <Text size="sm">
          A obra <strong>{project.name}</strong> será removida. Se houver contas
          ou recebíveis vinculados, a API vai recusar a exclusão — nesse caso,
          encerre a obra em vez de removê-la.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteProject.mutate(project.id),
    });

  const columns: DataTableColumn<Project>[] = [
    { key: 'name', header: 'Obra', render: (project) => project.name },
    {
      key: 'clientName',
      header: 'Cliente',
      render: (project) => project.clientName,
    },
    {
      key: 'status',
      header: 'Situação',
      render: (project) => (
        <Badge
          variant="light"
          radius="xl"
          color={project.status === 'ACTIVE' ? 'green' : 'gray'}
        >
          {PROJECT_STATUS_LABELS[project.status]}
        </Badge>
      ),
    },
  ];

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="flex-end">
        <Text size="sm" c="dimmed">
          Obras usadas para ratear custos e receitas. Contas sem obra contam
          como despesa administrativa.
        </Text>
        {canWrite && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setFormState({ open: true, project: null })}
          >
            Nova obra
          </Button>
        )}
      </Group>

      <Group gap="sm" align="flex-end">
        <Select
          label="Situação"
          size="xs"
          w={170}
          clearable
          placeholder="Todas"
          data={statusOptions}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as ProjectStatus | null)}
        />
      </Group>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar as obras"
      >
        <DataTable
          columns={columns}
          items={projects}
          rowKey={(project) => project.id}
          emptyMessage={
            statusFilter
              ? 'Nenhuma obra encontrada para a situação selecionada.'
              : 'Nenhuma obra cadastrada.'
          }
          renderActions={
            canWrite
              ? (project) => (
                  <RowActions
                    label={`Ações de ${project.name}`}
                    onEdit={() => setFormState({ open: true, project })}
                    onDelete={() => confirmDelete(project)}
                  />
                )
              : undefined
          }
          footer={`${projects.length} ${
            projects.length === 1 ? 'obra' : 'obras'
          }`}
        />
      </QueryBoundary>

      {formState.open && (
        <ProjectFormModal
          key={formState.project?.id ?? 'new'}
          project={formState.project}
          onClose={() => setFormState({ open: false })}
        />
      )}
    </Stack>
  );
}
