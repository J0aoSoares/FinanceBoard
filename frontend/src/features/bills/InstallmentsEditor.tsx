import {
  ActionIcon,
  Button,
  Collapse,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  IconArrowsSplit,
  IconPlus,
  IconTrash,
  IconWand,
} from '@tabler/icons-react';
import { useState } from 'react';
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
  generateRows,
  installmentsSum,
  nextRow,
  redistributeAmounts,
  relabelRows,
  totalDifference,
  type BillFormValues,
} from './bill-form';
import classes from './InstallmentsEditor.module.css';

interface InstallmentsEditorProps {
  form: UseFormReturnType<BillFormValues>;
  editing: boolean;
  amountLocked: boolean;
}

export function InstallmentsEditor({
  form,
  editing,
  amountLocked,
}: InstallmentsEditorProps) {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const values = form.getValues();
  const { installments, generator } = values;
  const sum = installmentsSum(installments);
  const difference = totalDifference(values);
  const mismatch =
    difference !== null && compareMoney(difference, '0.00') !== 0;

  const setRows = (rows: BillFormValues['installments']) => {
    form.setFieldValue('installments', rows);
    form.validateField('totalAmount');
  };

  const changePattern = (pattern: LabelPattern) => {
    form.setFieldValue('labelPattern', pattern);
    setRows(relabelRows(form.getValues().installments, pattern));
  };

  const renameLabel = (index: number, label: string) => {
    if (form.getValues().labelPattern !== 'manual') {
      form.setFieldValue('labelPattern', 'manual');
    }
    form.setFieldValue(`installments.${index}.label`, label);
  };

  const addRow = () => {
    const current = form.getValues();
    if (current.installments.length < MAX_INSTALLMENTS) {
      setRows([...current.installments, nextRow(current)]);
    }
  };

  const removeRow = (index: number) => {
    const current = form.getValues();
    const rows = current.installments.filter(
      (_, position) => position !== index,
    );
    setRows(
      current.labelPattern === 'manual'
        ? rows
        : relabelRows(rows, current.labelPattern),
    );
  };

  const generate = () => {
    const current = form.getValues();
    const { count, firstDueDate } = current.generator;
    if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
      form.setFieldError(
        'generator.count',
        `Informe de 1 a ${MAX_INSTALLMENTS} boletos`,
      );
      return;
    }
    if (!firstDueDate) {
      form.setFieldError(
        'generator.firstDueDate',
        'Informe o primeiro vencimento',
      );
      return;
    }
    setRows(generateRows(current, current.installments));
    setGeneratorOpen(false);
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Text fw={600} size="sm">
          {editing ? 'Boleto' : 'Boletos da NF'}
        </Text>
        {!editing && (
          <Group gap="xs" align="flex-end">
            <Select
              size="xs"
              w={130}
              label="Rótulos"
              data={LABEL_PATTERN_OPTIONS}
              allowDeselect={false}
              value={values.labelPattern}
              onChange={(next) => next && changePattern(next as LabelPattern)}
            />
            <Button
              size="xs"
              variant="light"
              leftSection={<IconWand size={14} />}
              onClick={() => setGeneratorOpen((open) => !open)}
            >
              Gerar boletos
            </Button>
          </Group>
        )}
      </Group>

      {!editing && (
        <Collapse expanded={generatorOpen}>
          <div className={classes.generator}>
            <Grid gap="sm" align="flex-end">
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <NumberInput
                  size="xs"
                  label="Quantidade"
                  min={1}
                  max={MAX_INSTALLMENTS}
                  allowDecimal={false}
                  allowNegative={false}
                  clampBehavior="strict"
                  value={generator.count}
                  error={form.errors['generator.count']}
                  onChange={(next) =>
                    form.setFieldValue('generator.count', Number(next) || 0)
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <DateField
                  size="xs"
                  label="Primeiro vencimento"
                  clearable={false}
                  value={generator.firstDueDate}
                  error={form.errors['generator.firstDueDate']}
                  onChange={(next) =>
                    form.setFieldValue('generator.firstDueDate', next)
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <NumberInput
                  size="xs"
                  label="Intervalo (meses)"
                  min={1}
                  max={12}
                  allowDecimal={false}
                  allowNegative={false}
                  clampBehavior="strict"
                  value={generator.intervalMonths}
                  onChange={(next) =>
                    form.setFieldValue(
                      'generator.intervalMonths',
                      Number(next) || 1,
                    )
                  }
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 3 }}>
                <Button size="xs" fullWidth onClick={generate}>
                  Gerar
                </Button>
              </Grid.Col>
            </Grid>
            <Text size="xs" c="dimmed" mt={6}>
              Substitui as linhas abaixo. Com o valor total da NF informado, ele
              é dividido entre os boletos; sem total, os valores já digitados
              são mantidos.
            </Text>
          </div>
        </Collapse>
      )}

      <div className={classes.wrapper}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th className={classes.label}>Rótulo</th>
              <th className={classes.date}>Vencimento</th>
              <th className={classes.amount}>Valor</th>
              <th>Linha digitável (opcional)</th>
              {!editing && <th className={classes.remove} />}
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
                    readOnly={editing}
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
                    disabled={amountLocked}
                    {...form.getInputProps(`installments.${index}.amount`)}
                    onBlur={() => {
                      form.validateField(`installments.${index}.amount`);
                      form.validateField('totalAmount');
                    }}
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
                {!editing && (
                  <td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Remover boleto ${index + 1}`}
                      disabled={installments.length === 1}
                      onClick={() => removeRow(index)}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!editing && (
        <Group
          justify="space-between"
          align="center"
          p="xs"
          className={mismatch ? classes.summaryError : classes.summary}
        >
          <Group gap="lg">
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<IconPlus size={14} />}
              disabled={installments.length >= MAX_INSTALLMENTS}
              onClick={addRow}
            >
              Adicionar boleto
            </Button>
            <Text size="xs" c="dimmed">
              {installments.length}{' '}
              {installments.length === 1 ? 'boleto' : 'boletos'} · soma{' '}
              <MoneyText value={sum} strong withSymbol />
            </Text>
            {values.totalAmount.trim() === '' ? (
              <Text size="xs" c="dimmed">
                Sem valor total informado: a NF vale a soma dos boletos
              </Text>
            ) : (
              mismatch && (
                <Text size="xs" c="red">
                  Diferença para o total{' '}
                  <MoneyText value={difference} strong withSymbol />
                </Text>
              )
            )}
          </Group>
          {mismatch && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconArrowsSplit size={14} />}
              onClick={() =>
                setRows(
                  redistributeAmounts(
                    form.getValues().installments,
                    form.getValues().totalAmount,
                  ),
                )
              }
            >
              Redistribuir
            </Button>
          )}
        </Group>
      )}
    </Stack>
  );
}
