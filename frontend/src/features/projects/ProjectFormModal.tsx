import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useCreateProject, useUpdateProject } from '../../hooks/use-catalog';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from '../../api/types';

interface ProjectFormModalProps {
  project: Project | null;
  onClose: () => void;
}

interface ProjectFormValues {
  name: string;
  clientName: string;
  status: ProjectStatus;
}

const statusOptions = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: PROJECT_STATUS_LABELS[status],
}));

export function ProjectFormModal({ project, onClose }: ProjectFormModalProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const form = useForm<ProjectFormValues>({
    mode: 'controlled',
    initialValues: {
      name: project?.name ?? '',
      clientName: project?.clientName ?? '',
      status: project?.status ?? 'ACTIVE',
    },
    validate: {
      name: (value) =>
        value.trim() === '' ? 'Nome da obra é obrigatório' : null,
      clientName: (value) =>
        value.trim() === '' ? 'Nome do cliente é obrigatório' : null,
    },
    validateInputOnBlur: true,
  });

  const isEditing = project !== null;
  const pending = createProject.isPending || updateProject.isPending;

  const handleSubmit = (submitted: ProjectFormValues) => {
    const input = {
      name: submitted.name.trim(),
      clientName: submitted.clientName.trim(),
      status: submitted.status,
    };
    const onSuccess = () => onClose();

    if (isEditing) {
      updateProject.mutate({ id: project.id, input }, { onSuccess });
    } else {
      createProject.mutate(input, { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar obra' : 'Nova obra'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome da obra"
            placeholder="Residencial Vista Verde"
            withAsterisk
            data-autofocus
            {...form.getInputProps('name')}
          />

          <TextInput
            label="Cliente"
            placeholder="Incorporadora Exemplo"
            withAsterisk
            {...form.getInputProps('clientName')}
          />

          <Select
            label="Situação"
            description="Obras encerradas deixam de aparecer na seleção de novas contas"
            data={statusOptions}
            allowDeselect={false}
            {...form.getInputProps('status')}
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
