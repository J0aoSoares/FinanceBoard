import {
  Button,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconArrowsSplit } from '@tabler/icons-react';
import { DateField } from '../../components/fields/DateField';
import { MoneyInput } from '../../components/fields/MoneyInput';
import { MoneyText } from '../../components/display/MoneyText';
import {
  LABEL_PATTERN_OPTIONS,
  type LabelPattern,
} from '../../lib/installment-labels';
import { compareMoney } from '../../lib/money';
import {
  MAX_INSTALLMENTS,
  MIN_INSTALLMENTS,
  installmentsDifference,
  installmentsSum,
  type BillFormValues,
  type InstallmentSettings,
} from './bill-form';
import classes from './InstallmentsEditor.module.css';

interface InstallmentsEditorProps {
  form: UseFormReturnType<BillFormValues>;
  onSettingsChange: (patch: Partial<InstallmentSettings>) => void;
  onRedistribute: () => void;
}

export function InstallmentsEditor({
  form,
  onSettingsChange,
  onRedistribute,
}: InstallmentsEditorProps) {
  const values = form.getValues();
  const { settings, installments } = values;
  const sum = installmentsSum(installments);
  const difference = installmentsDifference(values);
  const balanced =
    difference !== null && compareMoney(difference, '0.00') === 0;

  const renameLabel = (index: number, label: string) => {
    if (settings.labelPattern !== 'manual') {
      form.setFieldValue('settings.labelPattern', 'manual');
    }
    form.setFieldValue(`installments.${index}.label`, label);
  };

  return (
    <Stack gap="sm">
      <Grid gap="sm">
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Quantidade"
            min={MIN_INSTALLMENTS}
            max={MAX_INSTALLMENTS}
            allowDecimal={false}
            allowNegative={false}
            clampBehavior="strict"
            withAsterisk
            value={settings.count}
            error={form.errors['settings.count']}
            onChange={(next) => onSettingsChange({ count: Number(next) || 0 })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Select
            label="Rótulos"
            data={LABEL_PATTERN_OPTIONS}
            allowDeselect={false}
            value={settings.labelPattern}
            onChange={(next) =>
              next && onSettingsChange({ labelPattern: next as LabelPattern })
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <DateField
            label="Primeiro vencimento"
            withAsterisk
            clearable={false}
            value={settings.firstDueDate}
            error={form.errors['settings.firstDueDate']}
            onChange={(next) => onSettingsChange({ firstDueDate: next })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <NumberInput
            label="Intervalo (meses)"
            min={1}
            max={12}
            allowDecimal={false}
            allowNegative={false}
            clampBehavior="strict"
            value={settings.intervalMonths}
            onChange={(next) =>
              onSettingsChange({ intervalMonths: Number(next) || 1 })
            }
          />
        </Grid.Col>
      </Grid>

      {installments.length > 0 && (
        <div className={classes.wrapper}>
          <table className={classes.table}>
            <thead>
              <tr>
                <th className={classes.label}>Rótulo</th>
                <th className={classes.date}>Vencimento</th>
                <th className={classes.amount}>Valor</th>
                <th>Linha digitável (opcional)</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((row, index) => (
                <tr key={index}>
                  <td>
                    <TextInput
                      size="xs"
                      aria-label={`Rótulo do boleto ${index + 1}`}
                      value={row.label}
                      error={form.errors[`installments.${index}.label`]}
                      onChange={(event) =>
                        renameLabel(index, event.currentTarget.value)
                      }
                    />
                  </td>
                  <td>
                    <DateField
                      size="xs"
                      aria-label={`Vencimento do boleto ${index + 1}`}
                      clearable={false}
                      {...form.getInputProps(`installments.${index}.dueDate`)}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      size="xs"
                      aria-label={`Valor do boleto ${index + 1}`}
                      {...form.getInputProps(`installments.${index}.amount`)}
                    />
                  </td>
                  <td>
                    <TextInput
                      size="xs"
                      aria-label={`Linha digitável do boleto ${index + 1}`}
                      placeholder="Cole a linha digitável"
                      classNames={{ input: 'fb-numeric' }}
                      {...form.getInputProps(
                        `installments.${index}.digitableLine`,
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Group
        justify="space-between"
        align="center"
        p="xs"
        className={balanced ? classes.summary : classes.summaryError}
      >
        <Group gap="lg">
          <Text size="xs" c="dimmed">
            Soma dos boletos <MoneyText value={sum} strong withSymbol />
          </Text>
          <Text size="xs" c="dimmed">
            Total da compra{' '}
            <MoneyText value={values.amount || null} strong withSymbol />
          </Text>
          {!balanced && difference !== null && (
            <Text size="xs" c="red">
              Diferença <MoneyText value={difference} strong withSymbol />
            </Text>
          )}
        </Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconArrowsSplit size={14} />}
          disabled={installments.length === 0}
          onClick={onRedistribute}
        >
          Redistribuir
        </Button>
      </Group>
    </Stack>
  );
}
