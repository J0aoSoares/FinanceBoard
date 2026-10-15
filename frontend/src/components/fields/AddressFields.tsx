import { Grid, Select, TextInput } from '@mantine/core';
import { BRAZILIAN_STATES, formatZipCode } from '../../lib/contact-format';
import { onlyDigits } from '../../lib/document';

export interface AddressValues {
  zipCode: string;
  street: string;
  streetNumber: string;
  complement: string;
  district: string;
  city: string;
  state: string | null;
}

const stateOptions = BRAZILIAN_STATES.map((state) => ({
  value: state,
  label: state,
}));

interface AddressFieldsProps {
  value: AddressValues;
  onChange: (patch: Partial<AddressValues>) => void;
  zipCodeError?: string;
}

export function AddressFields({
  value,
  onChange,
  zipCodeError,
}: AddressFieldsProps) {
  const formatZip = () => {
    const digits = onlyDigits(value.zipCode);
    onChange({
      zipCode: digits === '' ? value.zipCode.trim() : formatZipCode(digits),
    });
  };

  return (
    <>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <TextInput
          label="CEP"
          placeholder="00000-000"
          value={value.zipCode}
          error={zipCodeError}
          onChange={(event) => onChange({ zipCode: event.currentTarget.value })}
          onBlur={formatZip}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 8 }}>
        <TextInput
          label="Logradouro"
          placeholder="Rua, avenida, rodovia…"
          value={value.street}
          onChange={(event) => onChange({ street: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 3 }}>
        <TextInput
          label="Número"
          placeholder="s/n"
          value={value.streetNumber}
          onChange={(event) =>
            onChange({ streetNumber: event.currentTarget.value })
          }
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 4 }}>
        <TextInput
          label="Complemento"
          value={value.complement}
          onChange={(event) =>
            onChange({ complement: event.currentTarget.value })
          }
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 5 }}>
        <TextInput
          label="Bairro"
          value={value.district}
          onChange={(event) =>
            onChange({ district: event.currentTarget.value })
          }
        />
      </Grid.Col>
      <Grid.Col span={{ base: 8, sm: 9 }}>
        <TextInput
          label="Cidade"
          value={value.city}
          onChange={(event) => onChange({ city: event.currentTarget.value })}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 4, sm: 3 }}>
        <Select
          label="UF"
          searchable
          clearable
          data={stateOptions}
          value={value.state}
          onChange={(state) => onChange({ state })}
        />
      </Grid.Col>
    </>
  );
}
