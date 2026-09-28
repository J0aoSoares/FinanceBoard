import { useAuth } from '../../auth/use-auth';
import { useCreateSupplierByName, useSuppliers } from '../../hooks/use-catalog';
import { CreatableEntitySelect } from './CreatableEntitySelect';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

export interface SupplierSelectProps extends EntitySelectProps {
  creatable?: boolean;
}

export function SupplierSelect({
  creatable = false,
  ...props
}: SupplierSelectProps) {
  const { canWrite } = useAuth();
  const { data, isLoading } = useSuppliers();
  const createByName = useCreateSupplierByName();

  if (creatable && canWrite) {
    return (
      <CreatableEntitySelect
        label="Fornecedor"
        placeholder="Digite o nome do fornecedor"
        entityName="fornecedor"
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
      label="Fornecedor"
      placeholder="Todos"
      options={(data ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      }))}
      loading={isLoading}
      {...props}
    />
  );
}
