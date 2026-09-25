import { Alert, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { useCashflowReport } from '../../hooks/use-reports';
import { useReportFilters } from '../../hooks/use-report-filters';
import { ApiError } from '../../lib/http';
import { formatMonth } from '../../lib/date';
import { csvMoney, downloadCsv, reportFileName } from '../../lib/csv';
import type { CashflowReport } from '../../api/types';
import { CashflowChart, type OutflowMode } from './CashflowChart';
import { CashflowTable } from './CashflowTable';
import { ReportEmptyState } from './ReportEmptyState';
import { ReportHeader } from './ReportHeader';
import { ReportSkeleton } from './ReportSkeleton';

const buildCsvRows = (report: CashflowReport) => [
  [
    'Mês',
    'Entradas',
    'Saída bruta',
    'Retenções',
    'Saída líquida',
    'Saldo',
    'Saldo acumulado',
  ],
  ...report.months.map((month) => [
    formatMonth(month.month),
    csvMoney(month.inflow),
    csvMoney(month.outflowGross),
    csvMoney(month.withholdings),
    csvMoney(month.outflow),
    csvMoney(month.balance),
    csvMoney(month.accumulatedBalance),
  ]),
  [
    'Total do período',
    csvMoney(report.totals.inflow),
    csvMoney(report.totals.outflowGross),
    csvMoney(report.totals.withholdings),
    csvMoney(report.totals.outflow),
    csvMoney(report.totals.balance),
    '',
  ],
];

const hasMovement = (report: CashflowReport) =>
  report.totals.inflow !== '0.00' || report.totals.outflowGross !== '0.00';

export function CashflowReportPage() {
  const { filters, periodError } = useReportFilters();
  const [outflowMode, setOutflowMode] = useState<OutflowMode>('net');

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
              A série de saída mostra valores{' '}
              {outflowMode === 'gross'
                ? 'brutos, antes das retenções — é este o número que fecha com o relatório de retenções.'
                : 'líquidos, o que efetivamente sai do caixa.'}
            </Text>
            <SegmentedControl
              size="xs"
              value={outflowMode}
              onChange={(value) => setOutflowMode(value as OutflowMode)}
              data={[
                { label: 'Saída líquida', value: 'net' },
                { label: 'Saída bruta', value: 'gross' },
              ]}
            />
          </Group>

          <CashflowChart months={data.months} outflowMode={outflowMode} />
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
