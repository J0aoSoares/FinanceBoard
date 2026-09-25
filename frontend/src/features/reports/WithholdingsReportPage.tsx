import {
  Alert,
  Button,
  Collapse,
  Group,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import tableClasses from '../../components/display/DataTable.module.css';
import { useWithholdingsReport } from '../../hooks/use-reports';
import { useReportFilters } from '../../hooks/use-report-filters';
import { ApiError } from '../../lib/http';
import { formatDate } from '../../lib/date';
import { formatCnpj } from '../../lib/document';
import { csvMoney, downloadCsv, reportFileName } from '../../lib/csv';
import type { Money } from '../../lib/money';
import {
  TAX_TYPES,
  TAX_TYPE_LABELS,
  type TaxType,
  type WithholdingBillDetail,
  type WithholdingByType,
  type WithholdingReport,
} from '../../api/types';
import { ReportEmptyState } from './ReportEmptyState';
import { ReportHeader } from './ReportHeader';
import { ReportSkeleton } from './ReportSkeleton';
import classes from './WithholdingsReportPage.module.css';

const ZERO: Money = '0.00';

const amountOf = (entries: WithholdingByType[], type: TaxType): Money =>
  entries.find((entry) => entry.type === type)?.amount ?? ZERO;

const buildCsvRows = (report: WithholdingReport) => [
  [
    'Documento',
    'Fornecedor',
    'Data de referência',
    'Bruto',
    'Líquido',
    ...TAX_TYPES.map((type) => TAX_TYPE_LABELS[type]),
    'Total retido',
  ],
  ...report.bills.map((bill) => [
    bill.documentNumber,
    bill.supplierName,
    formatDate(bill.referenceDate),
    csvMoney(bill.grossAmount),
    csvMoney(bill.netAmount),
    ...TAX_TYPES.map((type) => csvMoney(amountOf(bill.withholdings, type))),
    csvMoney(bill.withholdingTotal),
  ]),
  [
    `Total — ${report.totals.billCount} contas`,
    '',
    '',
    '',
    '',
    ...TAX_TYPES.map((type) => csvMoney(amountOf(report.totals.byType, type))),
    csvMoney(report.totals.total),
  ],
];

function BillsTable({ bills }: { bills: WithholdingBillDetail[] }) {
  return (
    <div className={tableClasses.wrapper}>
      <table className={tableClasses.table}>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Fornecedor</th>
            <th>Referência</th>
            <th className={tableClasses.numeric}>Bruto</th>
            <th className={tableClasses.numeric}>Líquido</th>
            {TAX_TYPES.map((type) => (
              <th key={type} className={tableClasses.numeric}>
                {TAX_TYPE_LABELS[type]}
              </th>
            ))}
            <th className={tableClasses.numeric}>Total retido</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id}>
              <td>{bill.documentNumber}</td>
              <td>{bill.supplierName}</td>
              <td>{formatDate(bill.referenceDate)}</td>
              <td className={tableClasses.numeric}>
                <MoneyText value={bill.grossAmount} />
              </td>
              <td className={tableClasses.numeric}>
                <MoneyText value={bill.netAmount} />
              </td>
              {TAX_TYPES.map((type) => {
                const amount = amountOf(bill.withholdings, type);
                return (
                  <td key={type} className={tableClasses.numeric}>
                    <MoneyText
                      value={amount}
                      tone={amount === ZERO ? 'muted' : 'default'}
                    />
                  </td>
                );
              })}
              <td className={tableClasses.numeric}>
                <MoneyText value={bill.withholdingTotal} strong />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WithholdingsReportPage() {
  const { filters, periodError } = useReportFilters();
  const [expanded, setExpanded] = useState(false);
  const [grouped, setGrouped] = useState(false);

  const { data, isLoading, isError, error, isFetching } =
    useWithholdingsReport(filters);

  const handleExport = () => {
    if (!data) {
      return;
    }
    downloadCsv(
      reportFileName('retencoes', data.from, data.to, data.regime),
      buildCsvRows(data),
    );
  };

  return (
    <Stack gap="md">
      <ReportHeader
        title="Retenções de impostos"
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
        <ReportSkeleton rows={6} />
      ) : data.companies.length === 0 ? (
        <ReportEmptyState
          from={data.from}
          to={data.to}
          regime={data.regime}
          subject="imposto retido"
        />
      ) : (
        <Stack gap="md">
          <div className={classes.cards}>
            {data.companies.map((company) => (
              <div key={company.companyId} className={classes.card}>
                <div className={classes.cardTitle}>{company.legalName}</div>
                <div className={classes.cardMeta}>
                  <span className="fb-numeric">{formatCnpj(company.cnpj)}</span>
                  {' · '}
                  {company.billCount}{' '}
                  {company.billCount === 1 ? 'conta' : 'contas'}
                </div>

                <div className={classes.cardTotal}>
                  <Text size="xs" c="dimmed">
                    Total retido
                  </Text>
                  <MoneyText value={company.total} strong withSymbol />
                </div>

                <div className={classes.breakdown}>
                  {TAX_TYPES.map((type) => {
                    const amount = amountOf(company.byType, type);
                    return (
                      <div key={type} className={classes.breakdownRow}>
                        <span>{TAX_TYPE_LABELS[type]}</span>
                        <span className={amount === ZERO ? classes.zero : ''}>
                          <MoneyText
                            value={amount}
                            tone={amount === ZERO ? 'muted' : 'default'}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Group justify="space-between" align="center" wrap="wrap">
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={
                <IconChevronRight
                  size={15}
                  style={{
                    transform: expanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 150ms',
                  }}
                />
              }
              onClick={() => setExpanded((previous) => !previous)}
            >
              {expanded ? 'Ocultar' : 'Detalhar'} contas com retenção (
              {data.totals.billCount})
            </Button>

            {expanded && (
              <Switch
                size="xs"
                label="Agrupar por empresa"
                checked={grouped}
                onChange={(event) => setGrouped(event.currentTarget.checked)}
              />
            )}
          </Group>

          <Collapse expanded={expanded}>
            {grouped ? (
              <Stack gap="sm">
                {data.companies.map((company) => (
                  <div key={company.companyId}>
                    <div className={classes.groupHeading}>
                      {company.legalName}
                    </div>
                    <BillsTable
                      bills={data.bills.filter(
                        (bill) => bill.companyId === company.companyId,
                      )}
                    />
                  </div>
                ))}
              </Stack>
            ) : (
              <BillsTable bills={data.bills} />
            )}
          </Collapse>

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
