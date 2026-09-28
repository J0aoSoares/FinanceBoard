import { useAuth } from '../../auth/use-auth';
import { useCreateProjectByName, useProjects } from '../../hooks/use-catalog';
import { CreatableEntitySelect } from './CreatableEntitySelect';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

interface ProjectSelectProps extends EntitySelectProps {
  activeOnly?: boolean;
  creatable?: boolean;
  newProjectClientName?: string;
  createDisabledReason?: string | null;
}

export function ProjectSelect({
  activeOnly = false,
  creatable = false,
  newProjectClientName = '',
  createDisabledReason = null,
  ...props
}: ProjectSelectProps) {
  const { canWrite } = useAuth();
  const { data, isLoading } = useProjects();
  const createByName = useCreateProjectByName(newProjectClientName);

  const projects = (data ?? []).filter(
    (project) =>
      !activeOnly || project.status === 'ACTIVE' || project.id === props.value,
  );

  if (creatable && canWrite) {
    return (
      <CreatableEntitySelect
        label="Obra"
        placeholder="Digite o nome da obra"
        entityName="obra"
        items={projects}
        loading={isLoading}
        creating={createByName.isPending}
        createDisabledReason={createDisabledReason}
        onCreate={(name, select) =>
          createByName.mutate(name, {
            onSuccess: ({ item }) => select(item.id),
          })
        }
        {...props}
      />
    );
  }

  return (
    <EntitySelect
      label="Obra"
      placeholder="Sem obra"
      options={projects.map((project) => ({
        value: project.id,
        label:
          project.status === 'CLOSED'
            ? `${project.name} (encerrada)`
            : project.name,
      }))}
      loading={isLoading}
      {...props}
    />
  );
}
