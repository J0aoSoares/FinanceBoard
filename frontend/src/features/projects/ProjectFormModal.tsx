import {
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  ScrollArea,
  Select,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { AddressFields } from '../../components/fields/AddressFields';
import { DateField } from '../../components/fields/DateField';
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
import {
  emptyProjectDetails,
  projectDetailsInput,
  projectToDetails,
  validateProjectDetails,
  type ProjectDetailsValues,
} from './project-form';

interface ProjectFormModalProps {
  project: Project | null;
  onClose: () => void;
}

const statusOptions = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: PROJECT_STATUS_LABELS[status],
}));

const DETAILS_LIMIT = 5000;

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
  const [details, setDetails] = useState<ProjectDetailsValues>(() =>
    project ? projectToDetails(project) : emptyProjectDetails(),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const pending = createProject.isPending || updateProject.isPending;

  const setDetail = (patch: Partial<ProjectDetailsValues>) =>
    setDetails((current) => ({ ...current, ...patch }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found: FormErrors = {
      ...validateProjectClient(clientState),
      ...validateProjectDetails(details),
      ...(name.trim() === '' ? { name: 'Nome da obra é obrigatório' } : {}),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    const input = {
      ...buildProjectInput(name, status, clientState, isEditing),
      ...projectDetailsInput(details, isEditing ? 'update' : 'create'),
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
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput
                label="Nome da obra"
                placeholder="Residencial Vista Verde"
                withAsterisk
                data-autofocus
                value={name}
                error={errors.name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                label="Situação"
                data={statusOptions}
                allowDeselect={false}
                value={status}
                onChange={(next) => next && setStatus(next as ProjectStatus)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Número do contrato"
                placeholder="CT-2026/014"
                value={details.contractNumber}
                onChange={(event) =>
                  setDetail({ contractNumber: event.currentTarget.value })
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <DateField
                label="Início"
                value={details.startDate}
                onChange={(startDate) => setDetail({ startDate })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <DateField
                label="Previsão de término"
                value={details.expectedEndDate}
                error={errors.expectedEndDate}
                onChange={(expectedEndDate) => setDetail({ expectedEndDate })}
              />
            </Grid.Col>
          </Grid>

          <Divider label="Cliente" labelPosition="left" />
          <ProjectClientSection
            value={clientState}
            onChange={setClientState}
            errors={errors}
          />

          <Divider label="Endereço da obra (opcional)" labelPosition="left" />
          <Grid gap="sm">
            <AddressFields
              value={details}
              onChange={setDetail}
              zipCodeError={errors.zipCode}
            />
          </Grid>

          <Divider label="Detalhes (opcional)" labelPosition="left" />
          <Textarea
            label="Detalhes da obra"
            description={`${details.details.length}/${DETAILS_LIMIT} caracteres`}
            placeholder="Ex.: escopo do serviço, acesso ao canteiro, horários, observações do contrato…"
            autosize
            minRows={3}
            maxRows={10}
            maxLength={DETAILS_LIMIT}
            value={details.details}
            onChange={(event) =>
              setDetail({ details: event.currentTarget.value })
            }
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
