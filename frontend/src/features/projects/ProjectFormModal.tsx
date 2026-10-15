import {
  Button,
  Group,
  Modal,
  ScrollArea,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { useCreateProject, useUpdateProject } from '../../hooks/use-catalog';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from '../../api/types';
import {
  buildProjectInput,
  emptyProjectClientState,
  projectClientState,
  validateProjectClient,
  type FormErrors,
} from '../clients/client-form';
import { ProjectClientSection } from '../clients/ProjectClientSection';

interface ProjectFormModalProps {
  project: Project | null;
  onClose: () => void;
}

const statusOptions = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: PROJECT_STATUS_LABELS[status],
}));

export function ProjectFormModal({ project, onClose }: ProjectFormModalProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEditing = project !== null;

  const [name, setName] = useState(project?.name ?? '');
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? 'ACTIVE',
  );
  const [clientState, setClientState] = useState(() =>
    project ? projectClientState(project) : emptyProjectClientState(),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const pending = createProject.isPending || updateProject.isPending;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found: FormErrors = {
      ...validateProjectClient(clientState),
      ...(name.trim() === '' ? { name: 'Nome da obra é obrigatório' } : {}),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    const input = buildProjectInput(name, status, clientState, isEditing);
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
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Nome da obra"
            placeholder="Residencial Vista Verde"
            withAsterisk
            data-autofocus
            value={name}
            error={errors.name}
            onChange={(event) => setName(event.currentTarget.value)}
          />

          <ProjectClientSection
            value={clientState}
            onChange={setClientState}
            errors={errors}
          />

          <Select
            label="Situação"
            description="Obras encerradas deixam de aparecer na seleção de novas contas"
            data={statusOptions}
            allowDeselect={false}
            value={status}
            onChange={(next) => next && setStatus(next as ProjectStatus)}
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
