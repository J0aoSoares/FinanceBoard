import { Combobox, InputBase, Loader, useCombobox } from '@mantine/core';
import { useEffect, useState, type FocusEvent } from 'react';
import { useAuth } from '../../auth/use-auth';
import { useCreateSupplierByName, useSuppliers } from '../../hooks/use-catalog';
import { nameKey } from '../../lib/name-key';
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

  if (creatable && canWrite) {
    return <CreatableSupplierInput {...props} />;
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

const CREATE_OPTION = '__create_supplier__';

function CreatableSupplierInput({
  value,
  onChange,
  onBlur,
  onFocus,
  label = 'Fornecedor',
  placeholder = 'Digite o nome do fornecedor',
  description,
  error,
  withAsterisk,
  disabled,
  size,
}: EntitySelectProps) {
  const { data, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplierByName();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { selectFirstOption } = combobox;
  const [search, setSearch] = useState<string | null>(null);

  const suppliers = data ?? [];
  const selected = suppliers.find((supplier) => supplier.id === value) ?? null;
  const text = search ?? selected?.name ?? '';
  const searchKey = search === null ? '' : nameKey(search);
  const exactMatch =
    searchKey === ''
      ? null
      : (suppliers.find((supplier) => nameKey(supplier.name) === searchKey) ??
        null);
  const matches =
    searchKey === ''
      ? suppliers
      : suppliers
          .filter((supplier) => nameKey(supplier.name).includes(searchKey))
          .sort((left, right) =>
            left.id === exactMatch?.id
              ? -1
              : right.id === exactMatch?.id
                ? 1
                : 0,
          );
  const newName = search?.trim() ?? '';
  const canCreate = searchKey !== '' && exactMatch === null;

  useEffect(() => {
    if (search !== null) {
      selectFirstOption();
    }
  }, [search, selectFirstOption]);

  const select = (id: string) => {
    setSearch(null);
    combobox.closeDropdown();
    onChange?.(id);
  };

  const create = () => {
    if (newName === '' || createSupplier.isPending) {
      return;
    }
    createSupplier.mutate(newName, {
      onSuccess: ({ supplier }) => select(supplier.id),
    });
  };

  const handleOptionSubmit = (option: string) => {
    if (option === CREATE_OPTION) {
      create();
    } else {
      select(option);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    combobox.closeDropdown();
    if (!createSupplier.isPending) {
      if (exactMatch) {
        select(exactMatch.id);
      } else {
        setSearch(null);
      }
    }
    onBlur?.(event);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    combobox.openDropdown();
    onFocus?.(event);
  };

  return (
    <Combobox store={combobox} onOptionSubmit={handleOptionSubmit} size={size}>
      <Combobox.Target>
        <InputBase
          label={label}
          placeholder={placeholder}
          description={description}
          error={error}
          withAsterisk={withAsterisk}
          size={size}
          disabled={disabled || isLoading}
          readOnly={createSupplier.isPending}
          value={text}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.openDropdown();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          rightSection={
            createSupplier.isPending ? (
              <Loader size="xs" />
            ) : (
              <Combobox.Chevron />
            )
          }
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={260} style={{ overflowY: 'auto' }}>
          {matches.map((supplier) => (
            <Combobox.Option
              key={supplier.id}
              value={supplier.id}
              active={supplier.id === value}
            >
              {supplier.name}
            </Combobox.Option>
          ))}
          {canCreate && (
            <Combobox.Option value={CREATE_OPTION}>
              Cadastrar fornecedor '{newName}'
            </Combobox.Option>
          )}
          {matches.length === 0 && !canCreate && (
            <Combobox.Empty>Nada encontrado</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
