import { Alert, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { useCashflowReport } from '../../hooks/use-reports';
import { useReportFilters } from '../../hooks/use-report-filters';
import { ApiError } from '../../lib/http';
import { formatMonth } from '../../lib/date';
import { csvMoney, downloadCsv, reportFileName } from '../../lib/csv';
import type { CashflowReport } from '../../api/types';
import { CashflowChart, type InflowMode } from './CashflowChart';
import { CashflowTable } from './CashflowTable';
import { ReportEmptyState } from './ReportEmptyState';
import { ReportHeader } from './ReportHeader';
import { ReportSkeleton } from './ReportSkeleton';

const buildCsvRows = (report: CashflowReport) => [
  [
    'Mês',
    'Faturado bruto',
    'Retenções sofridas',
    'Entradas líquidas',
    'Saídas',
    'Saldo',
    'Saldo acumulado',
  ],
  ...report.months.map((month) => [
    formatMonth(month.month),
    csvMoney(month.inflowGross),
    csvMoney(month.inflowWithholdings),
    csvMoney(month.inflow),
    csvMoney(month.outflow),
    csvMoney(month.balance),
    csvMoney(month.accumulatedBalance),
  ]),
  [
    'Total do período',
    csvMoney(report.totals.inflowGross),
    csvMoney(report.totals.inflowWithholdings),
    csvMoney(report.totals.inflow),
    csvMoney(report.totals.outflow),
    csvMoney(report.totals.balance),
    '',
  ],
];

const hasMovement = (report: CashflowReport) =>
  report.totals.inflowGross !== '0.00' || report.totals.outflow !== '0.00';

export function CashflowReportPage() {
  const { filters, periodError } = useReportFilters();
  const [inflowMode, setInflowMode] = useState<InflowMode>('net');

  const { data, isLoading, isError, error, isFetching } =
    useCashflowReport(filters);

  const handleExport = () => {
    if (!data) {
      return;
    }
    downloadCsv(
      reportFileName('fluxo-de-caixa', data.from, data.to, data.regime),
      buildCsvRows(data),
    );
  };

  return (
    <Stack gap="md">
      <ReportHeader
        title="Fluxo de caixa"
        report={data}
        onExport={handleExport}
        exportDisabled={!data}
      />

      {periodError ? null : isError ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Não foi possível gerar o relatório"
        >
          {error instanceof ApiError
            ? error.messages.join(' ')
            : 'Erro inesperado'}
        </Alert>
      ) : isLoading || !data ? (
        <ReportSkeleton withChart rows={6} />
      ) : !hasMovement(data) ? (
        <ReportEmptyState
          from={data.from}
          to={data.to}
          regime={data.regime}
          subject="lançamento"
        />
      ) : (
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Text size="xs" c="dimmed">
              A série de entrada mostra{' '}
              {inflowMode === 'gross'
                ? 'o faturado bruto das notas, antes das retenções sofridas.'
                : 'o líquido das notas, o que efetivamente entra no caixa.'}
            </Text>
            <SegmentedControl
              size="xs"
              value={inflowMode}
              onChange={(value) => setInflowMode(value as InflowMode)}
              data={[
                { label: 'Entrada líquida', value: 'net' },
                { label: 'Faturado bruto', value: 'gross' },
              ]}
            />
          </Group>

          <CashflowChart months={data.months} inflowMode={inflowMode} />
          <CashflowTable report={data} />

          {isFetching && (
            <Text size="xs" c="dimmed">
              Atualizando…
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
