import { ActionIcon, Button, Group, Select, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { MoneyInput } from '../../components/fields/MoneyInput';
import { TAX_TYPES, TAX_TYPE_LABELS, type TaxType } from '../../api/types';
import type { BillFormValues } from './bill-form';
import type { UseFormReturnType } from '@mantine/form';

interface WithholdingsFieldProps {
  form: UseFormReturnType<BillFormValues>;
}

export function WithholdingsField({ form }: WithholdingsFieldProps) {
  const rows = form.getValues().withholdings;
  const usedTypes = rows.map((row) => row.type);
  const availableTypes = TAX_TYPES.filter((type) => !usedTypes.includes(type));

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text size="sm" fw={500}>
          Retenções
        </Text>
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          disabled={availableTypes.length === 0}
          onClick={() =>
            form.insertListItem('withholdings', {
              type: availableTypes[0],
              amount: '',
            })
          }
        >
          Adicionar
        </Button>
      </Group>

      {rows.length === 0 ? (
        <Text size="xs" c="dimmed">
          Nenhuma retenção. O líquido será igual ao valor bruto.
        </Text>
      ) : (
        rows.map((row, index) => (
          <Group key={index} gap="xs" align="flex-start" wrap="nowrap">
            <Select
              size="xs"
              w={170}
              allowDeselect={false}
              data={TAX_TYPES.filter(
                (type) => type === row.type || !usedTypes.includes(type),
              ).map((type) => ({ value: type, label: TAX_TYPE_LABELS[type] }))}
              {...form.getInputProps(`withholdings.${index}.type`)}
              onChange={(value) =>
                form.setFieldValue(
                  `withholdings.${index}.type`,
                  value as TaxType,
                )
              }
            />
            <MoneyInput
              size="xs"
              style={{ flex: 1 }}
              {...form.getInputProps(`withholdings.${index}.amount`)}
            />
            <ActionIcon
              size="md"
              variant="subtle"
              color="red"
              aria-label="Remover retenção"
              onClick={() => form.removeListItem('withholdings', index)}
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Group>
        ))
      )}
    </Stack>
  );
}
