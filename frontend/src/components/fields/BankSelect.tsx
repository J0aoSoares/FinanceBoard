import { useBanks } from '../../hooks/use-project-billings';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

export function BankSelect(props: EntitySelectProps) {
  const { data, isLoading } = useBanks();

  return (
    <EntitySelect
      label="Banco"
      placeholder="Selecione o banco"
      options={(data ?? []).map((bank) => ({
        value: bank.id,
        label: `${bank.name} (${bank.code})`,
      }))}
      loading={isLoading}
      {...props}
    />
  );
}
