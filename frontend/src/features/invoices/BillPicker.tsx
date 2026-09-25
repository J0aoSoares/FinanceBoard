import { Checkbox, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { MonthField } from '../../components/fields/MonthField';
import tableClasses from '../../components/display/DataTable.module.css';
import { useBills } from '../../hooks/use-bills';
import { apiDate, formatDate, monthOf } from '../../lib/date';
import type { Bill } from '../../api/types';
import {
  eligibleBills,
  selectionTotals,
  toggleBill,
} from './invoice-composition';

interface BillPickerProps {
  companyId: string;
  invoiceId?: string;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

const matchesSearch = (bill: Bill, term: string) => {
  if (term === '') {
    return true;
  }
  const needle = term.toLowerCase();
  return (
    bill.supplier.name.toLowerCase().includes(needle) ||
    bill.documentNumber.toLowerCase().includes(needle)
  );
};

const matchesMonth = (bill: Bill, month: string | null) => {
  if (!month) {
    return true;
  }
  const issueDate = apiDate(bill.issueDate);
  return issueDate ? monthOf(issueDate) === month : false;
};

export function BillPicker({
  companyId,
  invoiceId,
  selectedIds,
  onChange,
}: BillPickerProps) {
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useBills({ companyId });

  const candidates = useMemo(
    () => eligibleBills(data ?? [], { companyId, invoiceId }),
    [data, companyId, invoiceId],
  );

  const visible = useMemo(
    () =>
      candidates.filter(
        (bill) => matchesSearch(bill, search) && matchesMonth(bill, month),
      ),
    [candidates, search, month],
  );

  const totals = selectionTotals(candidates, selectedIds);
  const selected = new Set(selectedIds);

  return (
    <Stack gap="sm">
      <Group gap="sm" align="flex-end" wrap="wrap">
        <TextInput
          label="Buscar"
          size="xs"
          w={260}
          placeholder="Fornecedor ou documento"
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <MonthField
          label="Competência de emissão"
          size="xs"
          w={220}
          clearable
          placeholder="Todas"
          value={month}
          onChange={setMonth}
        />
      </Group>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar as contas disponíveis"
      >
        <div className={tableClasses.wrapper}>
          {visible.length === 0 ? (
            <p className={tableClasses.empty}>
              {candidates.length === 0
                ? 'Nenhuma conta desta empresa está disponível para faturamento. Contas já faturadas ou pagas fora de fatura não podem ser incluídas.'
                : 'Nenhuma conta corresponde à busca ou à competência selecionada.'}
            </p>
          ) : (
            <table className={tableClasses.table}>
              <thead>
                <tr>
                  <th className={tableClasses.actions} />
                  <th>Fornecedor</th>
                  <th>Documento</th>
                  <th>Obra</th>
                  <th>Emissão</th>
                  <th>Vencimento</th>
                  <th className={tableClasses.numeric}>Bruto</th>
                  <th className={tableClasses.numeric}>Líquido</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((bill) => (
                  <tr key={bill.id}>
                    <td className={tableClasses.actions}>
                      <Checkbox
                        aria-label={`Selecionar ${bill.documentNumber}`}
                        checked={selected.has(bill.id)}
                        onChange={() =>
                          onChange(toggleBill(selectedIds, bill.id))
                        }
                      />
                    </td>
                    <td>{bill.supplier.name}</td>
                    <td>{bill.documentNumber}</td>
                    <td>
                      {bill.project ? (
                        bill.project.name
                      ) : (
                        <span className={tableClasses.secondary}>
                          Administrativa
                        </span>
                      )}
                    </td>
                    <td>{formatDate(bill.issueDate)}</td>
                    <td>{formatDate(bill.dueDate)}</td>
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bill.grossAmount} />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bill.netAmount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </QueryBoundary>

      <Group
        justify="space-between"
        align="center"
        bg="var(--fb-surface-sunken)"
        p="xs"
        style={{ borderRadius: 'var(--fb-radius-sm)' }}
      >
        <Text size="xs" c="dimmed">
          {totals.count === 0
            ? 'Nenhuma conta selecionada'
            : `${totals.count} ${totals.count === 1 ? 'conta selecionada' : 'contas selecionadas'}`}
        </Text>
        <Group gap="lg">
          <Stack gap={0} align="flex-end">
            <Text size="xs" c="dimmed">
              Bruto
            </Text>
            <MoneyText value={totals.grossTotal} strong withSymbol />
          </Stack>
          <Stack gap={0} align="flex-end">
            <Text size="xs" c="dimmed">
              Retenções
            </Text>
            <MoneyText value={totals.withholdingTotal} tone="muted" />
          </Stack>
          <Stack gap={0} align="flex-end">
            <Text size="xs" c="dimmed">
              Líquido
            </Text>
            <MoneyText
              value={totals.netTotal}
              tone="outflow"
              strong
              withSymbol
            />
          </Stack>
        </Group>
      </Group>
    </Stack>
  );
}
