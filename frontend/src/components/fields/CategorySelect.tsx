import { useAuth } from '../../auth/use-auth';
import {
  useCategories,
  useCreateCategoryByName,
} from '../../hooks/use-catalog';
import { CreatableEntitySelect } from './CreatableEntitySelect';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

export interface CategorySelectProps extends EntitySelectProps {
  creatable?: boolean;
}

export function CategorySelect({
  creatable = false,
  ...props
}: CategorySelectProps) {
  const { canWrite } = useAuth();
  const { data, isLoading } = useCategories();
  const createByName = useCreateCategoryByName();

  if (creatable && canWrite) {
    return (
      <CreatableEntitySelect
        label="Categoria"
        placeholder="Digite o nome da categoria"
        entityName="categoria"
        items={data ?? []}
        loading={isLoading}
        creating={createByName.isPending}
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
