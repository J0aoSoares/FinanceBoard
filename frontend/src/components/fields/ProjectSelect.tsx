import { useProjects } from '../../hooks/use-catalog';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

interface ProjectSelectProps extends EntitySelectProps {
  activeOnly?: boolean;
}

export function ProjectSelect({
  activeOnly = false,
  ...props
}: ProjectSelectProps) {
  const { data, isLoading } = useProjects();

  const projects = (data ?? []).filter(
    (project) =>
      !activeOnly || project.status === 'ACTIVE' || project.id === props.value,
  );

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
