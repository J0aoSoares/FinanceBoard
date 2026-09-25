import { useCategories } from '../../hooks/use-catalog';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

export function CategorySelect(props: EntitySelectProps) {
  const { data, isLoading } = useCategories();

  return (
    <EntitySelect
      label="Categoria"
      placeholder="Todas"
      options={(data ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      }))}
      loading={isLoading}
      {...props}
    />
  );
}
