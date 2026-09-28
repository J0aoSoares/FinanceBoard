import { Combobox, InputBase, Loader, useCombobox } from '@mantine/core';
import { useEffect, useState, type FocusEvent } from 'react';
import {
  findByNameKey,
  type NamedEntity,
} from '../../hooks/use-create-by-name';
import { nameKey } from '../../lib/name-key';
import type { EntitySelectProps } from './EntitySelect';

const CREATE_OPTION = '__create_entity__';

export interface CreatableEntitySelectProps extends EntitySelectProps {
  items: NamedEntity[];
  loading: boolean;
  entityName: string;
  creating: boolean;
  createDisabledReason?: string | null;
  onCreate: (name: string, select: (id: string) => void) => void;
}

export function CreatableEntitySelect({
  items,
  loading,
  entityName,
  creating,
  createDisabledReason = null,
  onCreate,
  value,
  onChange,
  onBlur,
  onFocus,
  label,
  placeholder,
  description,
  error,
  withAsterisk,
  disabled,
  size,
  clearable = false,
}: CreatableEntitySelectProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { selectFirstOption } = combobox;
  const [search, setSearch] = useState<string | null>(null);

  const selected = items.find((item) => item.id === value) ?? null;
  const text = search ?? selected?.name ?? '';
  const searchKey = search === null ? '' : nameKey(search);
  const exactMatch = search === null ? null : findByNameKey(items, search);
  const matches =
    searchKey === ''
      ? items
      : items
          .filter((item) => nameKey(item.name).includes(searchKey))
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
    if (newName === '' || creating || createDisabledReason) {
      return;
    }
    onCreate(newName, select);
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
    if (!creating) {
      if (clearable && search !== null && search.trim() === '') {
        setSearch(null);
        onChange?.(null);
      } else if (exactMatch) {
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
          disabled={disabled || loading}
          readOnly={creating}
          value={text}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.openDropdown();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          rightSection={creating ? <Loader size="xs" /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={260} style={{ overflowY: 'auto' }}>
          {matches.map((item) => (
            <Combobox.Option
              key={item.id}
              value={item.id}
              active={item.id === value}
            >
              {item.name}
            </Combobox.Option>
          ))}
          {canCreate && (
            <Combobox.Option
              value={CREATE_OPTION}
              disabled={Boolean(createDisabledReason)}
            >
              {createDisabledReason ?? `Cadastrar ${entityName} '${newName}'`}
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
