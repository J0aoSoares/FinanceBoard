import { useCompanies } from '../../hooks/use-catalog';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

export function CompanySelect(props: EntitySelectProps) {
  const { data, isLoading } = useCompanies();

  return (
    <EntitySelect
      label="Empresa"
      placeholder="Consolidado"
      options={(data ?? []).map((company) => ({
        value: company.id,
        label: company.legalName,
      }))}
      loading={isLoading}
      {...props}
    />
  );
}
