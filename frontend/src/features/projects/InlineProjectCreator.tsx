import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useCreateProject } from '../../hooks/use-catalog';
import type { Project } from '../../api/types';
import {
  buildProjectInput,
  emptyProjectClientState,
  validateProjectClient,
  type FormErrors,
} from '../clients/client-form';
import { ProjectClientSection } from '../clients/ProjectClientSection';
import classes from '../clients/ClientDetailsFields.module.css';

interface InlineProjectCreatorProps {
  initialName: string;
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

export function InlineProjectCreator({
  initialName,
  onCreated,
  onCancel,
}: InlineProjectCreatorProps) {
  const createProject = useCreateProject();
  const [name, setName] = useState(initialName);
  const [clientState, setClientState] = useState(emptyProjectClientState);
  const [errors, setErrors] = useState<FormErrors>({});

  const submit = () => {
    const found: FormErrors = {
      ...validateProjectClient(clientState),
      ...(name.trim() === '' ? { name: 'Nome da obra é obrigatório' } : {}),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    createProject.mutate(
      buildProjectInput(name, 'ACTIVE', clientState, false),
      {
        onSuccess: (project) => onCreated(project),
      },
    );
  };

  return (
    <div className={classes.section}>
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          Nova obra
        </Text>
        <TextInput
          label="Nome da obra"
          withAsterisk
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <ProjectClientSection
          value={clientState}
          onChange={setClientState}
          errors={errors}
        />
        <Group justify="flex-end" gap="xs">
          <Button
            variant="default"
            onClick={onCancel}
            disabled={createProject.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} loading={createProject.isPending}>
            Criar obra
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
