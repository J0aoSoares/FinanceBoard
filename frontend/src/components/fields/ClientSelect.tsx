import { useAuth } from '../../auth/use-auth';
import { useClients } from '../../hooks/use-clients';
import { formatDocument } from '../../lib/document';
import { CreatableEntitySelect } from './CreatableEntitySelect';
import { EntitySelect, type EntitySelectProps } from './EntitySelect';

interface ClientSelectProps extends EntitySelectProps {
  onCreateRequest?: (name: string) => void;
}

export function ClientSelect({ onCreateRequest, ...props }: ClientSelectProps) {
  const { canWrite } = useAuth();
  const { data, isLoading } = useClients();

  const items = (data ?? []).map((client) => {
    const document = formatDocument(client.document);
    return {
      id: client.id,
      name: client.name,
      searchText: [client.tradeName, client.document, document]
        .filter(Boolean)
        .join(' '),
      description:
        [client.tradeName, document].filter(Boolean).join(' · ') || undefined,
    };
  });

  if (onCreateRequest && canWrite) {
    return (
      <CreatableEntitySelect
        label="Cliente"
        placeholder="Digite nome, fantasia ou CNPJ/CPF"
        entityName="cliente"
        items={items}
        loading={isLoading}
        creating={false}
        allowDuplicateNames
        onCreate={(name) => onCreateRequest(name)}
        {...props}
      />
    );
  }

  return (
    <EntitySelect
      label="Cliente"
      placeholder="Selecione o cliente"
      options={items.map((item) => ({
        value: item.id,
        label: item.description
          ? `${item.name} — ${item.description}`
          : item.name,
      }))}
      loading={isLoading}
      {...props}
    />
  );
}
