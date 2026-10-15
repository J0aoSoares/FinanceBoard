import { useAuth } from '../../auth/use-auth';
import { useProjects } from '../../hooks/use-catalog';
import { CreatableEntitySelect } from './CreatableEntitySelect';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

interface ProjectSelectProps extends EntitySelectProps {
  activeOnly?: boolean;
  onCreateRequest?: (name: string) => void;
}

export function ProjectSelect({
  activeOnly = false,
  onCreateRequest,
  ...props
}: ProjectSelectProps) {
  const { canWrite } = useAuth();
  const { data, isLoading } = useProjects();

  const projects = (data ?? []).filter(
    (project) =>
      !activeOnly || project.status === 'ACTIVE' || project.id === props.value,
  );

  if (onCreateRequest && canWrite) {
    return (
      <CreatableEntitySelect
        label="Obra"
        placeholder="Digite o nome da obra"
        entityName="obra"
        items={projects.map((project) => ({
          id: project.id,
          name: project.name,
          searchText: project.client?.name ?? project.clientName ?? '',
          description: project.client?.name ?? project.clientName ?? undefined,
        }))}
        loading={isLoading}
        creating={false}
        onCreate={(name) => onCreateRequest(name)}
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
