import { Alert, Button, Collapse, Group, Stack, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronRight,
  IconDownload,
} from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import tableClasses from '../../components/display/DataTable.module.css';
import { useWithholdingsReport } from '../../hooks/use-reports';
import { useReportFilters } from '../../hooks/use-report-filters';
import { ApiError } from '../../lib/http';
import { formatCompetence, formatDate } from '../../lib/date';
import { formatCnpj } from '../../lib/document';
import { downloadCsv, reportFileName, type CsvCell } from '../../lib/csv';
import type { Money } from '../../lib/money';
import {
  amountOf,
  companyCsvRows,
  invoiceCsvRows,
  legacyCsvRows,
  projectCsvRows,
} from '../../lib/withholding-report';
import {
  TAX_TYPES,
  TAX_TYPE_LABELS,
  type WithholdingByType,
  type WithholdingReport,
} from '../../api/types';
import { ReportEmptyState } from './ReportEmptyState';
import { ReportHeader } from './ReportHeader';
import { ReportSkeleton } from './ReportSkeleton';
import classes from './WithholdingsReportPage.module.css';

const ZERO: Money = '0.00';

function Amount({ value }: { value: Money }) {
  return (
    <MoneyText value={value} tone={value === ZERO ? 'muted' : 'default'} />
  );
}

function TypeCells({ byType }: { byType: WithholdingByType[] }) {
  return (
    <>
      {TAX_TYPES.map((type) => (
        <td key={type} className={tableClasses.numeric}>
          <Amount value={amountOf(byType, type)} />
        </td>
      ))}
    </>
  );
}

function TypeHeaders() {
  return (
    <>
      {TAX_TYPES.map((type) => (
        <th key={type} className={tableClasses.numeric}>
          {TAX_TYPE_LABELS[type]}
        </th>
      ))}
    </>
  );
}

function Section({
  title,
  onExport,
  children,
}: {
  title: string;
  onExport: () => void;
  children: ReactNode;
}) {
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          color="gray"
          leftSection={<IconDownload size={13} />}
          onClick={onExport}
        >
          CSV
        </Button>
      </Group>
      {children}
    </Stack>
  );
}

function SummaryTables({
  report,
  exportRows,
}: {
  report: WithholdingReport;
  exportRows: (name: string, rows: CsvCell[][]) => void;
}) {
  const totalRow = (leading: number) => (
    <tr className={tableClasses.footer}>
      <td colSpan={leading}>Total</td>
      <td className={tableClasses.numeric}>{report.totals.invoiceCount}</td>
      <TypeCells byType={report.totals.byType} />
      <td className={tableClasses.numeric}>
        <MoneyText value={report.totals.total} strong />
      </td>
    </tr>
  );

  return (
    <div className={classes.summaries}>
      <Section
        title="Por empresa"
        onExport={() =>
          exportRows('retencoes-por-empresa', companyCsvRows(report))
        }
      >
        <div className={tableClasses.wrapper}>
          <table className={`${tableClasses.table} ${classes.dense}`}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th className={tableClasses.numeric}>Notas</th>
                <TypeHeaders />
                <th className={tableClasses.numeric}>Total</th>
              </tr>
            </thead>
            <tbody>
              {report.companies.map((company) => (
                <tr key={company.companyId}>
                  <td>
                    {company.legalName}
                    <span className={`${tableClasses.secondary} fb-numeric`}>
                      {formatCnpj(company.cnpj)}
                    </span>
                  </td>
                  <td className={tableClasses.numeric}>
                    {company.invoiceCount}
                  </td>
                  <TypeCells byType={company.byType} />
                  <td className={tableClasses.numeric}>
                    <MoneyText value={company.total} strong />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>{totalRow(1)}</tfoot>
          </table>
        </div>
      </Section>

      <Section
        title="Por obra"
        onExport={() =>
          exportRows('retencoes-por-obra', projectCsvRows(report))
        }
      >
        <div className={tableClasses.wrapper}>
          <table className={`${tableClasses.table} ${classes.dense}`}>
            <thead>
              <tr>
                <th>Obra</th>
                <th className={tableClasses.numeric}>Notas</th>
                <TypeHeaders />
                <th className={tableClasses.numeric}>Total</th>
              </tr>
            </thead>
            <tbody>
              {report.projects.map((project) => (
                <tr key={project.projectId ?? 'sem-obra'}>
                  <td>{project.name}</td>
                  <td className={tableClasses.numeric}>
                    {project.invoiceCount}
                  </td>
                  <TypeCells byType={project.byType} />
                  <td className={tableClasses.numeric}>
                    <MoneyText value={project.total} strong />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>{totalRow(1)}</tfoot>
          </table>
        </div>
      </Section>
    </div>
  );
}

function InvoicesTable({ report }: { report: WithholdingReport }) {
  return (
    <div className={tableClasses.wrapper}>
      <table className={`${tableClasses.table} ${classes.dense}`}>
        <thead>
          <tr>
            <th>Número</th>
            <th>Empresa</th>
            <th>Obra</th>
            <th>Tomador</th>
            <th>Comp.</th>
            <th>Emissão</th>
            <th>Recebim.</th>
            <th className={tableClasses.numeric}>Bruto</th>
            <TypeHeaders />
            <th className={tableClasses.numeric}>Total retido</th>
            <th className={tableClasses.numeric}>Líquido</th>
          </tr>
        </thead>
        <tbody>
          {report.invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.number ?? '—'}</td>
              <td>
                {invoice.legalName}
                <span className={`${tableClasses.secondary} fb-numeric`}>
                  {formatCnpj(invoice.cnpj)}
                </span>
              </td>
              <td>{invoice.projectName ?? '—'}</td>
              <td>{invoice.clientName}</td>
              <td>{formatCompetence(invoice.competence)}</td>
              <td>{formatDate(invoice.issueDate)}</td>
              <td>{formatDate(invoice.receiptDate)}</td>
              <td className={tableClasses.numeric}>
                <MoneyText value={invoice.grossAmount} />
              </td>
              {TAX_TYPES.map((type) => (
                <td key={type} className={tableClasses.numeric}>
                  <Amount value={invoice.amountsByType[type]} />
                </td>
              ))}
              <td className={tableClasses.numeric}>
                <MoneyText value={invoice.withholdingTotal} strong />
              </td>
              <td className={tableClasses.numeric}>
                <MoneyText value={invoice.netAmount} tone="inflow" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={tableClasses.footer}>
            <td colSpan={7}>
              {report.totals.invoiceCount}{' '}
              {report.totals.invoiceCount === 1 ? 'nota' : 'notas'}
            </td>
            <td className={tableClasses.numeric}>
              <MoneyText value={report.totals.grossAmount} strong />
            </td>
            <TypeCells byType={report.totals.byType} />
            <td className={tableClasses.numeric}>
              <MoneyText value={report.totals.total} strong />
            </td>
            <td className={tableClasses.numeric}>
              <MoneyText value={report.totals.netAmount} tone="inflow" strong />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function LegacyBlock({
  report,
  onExport,
}: {
  report: WithholdingReport;
  onExport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { bills, totals } = report.legacy;

  return (
    <div className={classes.legacy}>
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
          Histórico: retenções lançadas em boletos (modelo anterior) ·{' '}
          {totals.billCount} {totals.billCount === 1 ? 'boleto' : 'boletos'}
        </Button>
        {expanded && (
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            leftSection={<IconDownload size={13} />}
            onClick={onExport}
          >
            CSV
          </Button>
        )}
      </Group>

      <Collapse expanded={expanded}>
        <Stack gap="xs" pt="xs">
          <Text size="xs" c="dimmed">
            Valores registrados antes de as retenções passarem para as notas de
            serviço. Não são retenções sofridas e não entram nos totais acima.
          </Text>
          <div className={tableClasses.wrapper}>
            <table className={`${tableClasses.table} ${classes.dense}`}>
              <thead>
                <tr>
                  <th>NF</th>
                  <th>Empresa</th>
                  <th>Fornecedor</th>
                  <th>Referência</th>
                  <th className={tableClasses.numeric}>Bruto</th>
                  <TypeHeaders />
                  <th className={tableClasses.numeric}>Total retido</th>
                  <th className={tableClasses.numeric}>Líquido</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.documentNumber}</td>
                    <td>{bill.legalName}</td>
                    <td>{bill.supplierName}</td>
                    <td>{formatDate(bill.referenceDate)}</td>
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bill.grossAmount} />
                    </td>
                    {TAX_TYPES.map((type) => (
                      <td key={type} className={tableClasses.numeric}>
                        <Amount value={bill.amountsByType[type]} />
                      </td>
                    ))}
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bill.withholdingTotal} strong />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bill.netAmount} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={tableClasses.footer}>
                  <td colSpan={5}>Total do histórico</td>
                  <TypeCells byType={totals.byType} />
                  <td className={tableClasses.numeric}>
                    <MoneyText value={totals.total} strong />
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Stack>
      </Collapse>
    </div>
  );
}

export function WithholdingsReportPage() {
  const { filters, periodError } = useReportFilters();
  const { data, isLoading, isError, error, isFetching } =
    useWithholdingsReport(filters);

  const exportRows = (name: string, rows: CsvCell[][]) => {
    if (data) {
      downloadCsv(reportFileName(name, data.from, data.to, data.regime), rows);
    }
  };

  const empty =
    data && data.invoices.length === 0 && data.legacy.bills.length === 0;

  return (
    <Stack gap="md">
      <ReportHeader
        title="Retenções sofridas"
        report={data}
        onExport={() =>
          data && exportRows('retencoes-sofridas', invoiceCsvRows(data))
        }
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
      ) : empty ? (
        <ReportEmptyState
          from={data.from}
          to={data.to}
          regime={data.regime}
          subject="imposto retido"
        />
      ) : (
        <Stack gap="lg">
          {data.invoices.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nenhuma retenção sofrida em notas de serviço no período.
            </Text>
          ) : (
            <>
              <SummaryTables report={data} exportRows={exportRows} />
              <Section
                title="Notas de serviço com retenção"
                onExport={() =>
                  exportRows('retencoes-sofridas', invoiceCsvRows(data))
                }
              >
                <InvoicesTable report={data} />
              </Section>
            </>
          )}

          {data.legacy.bills.length > 0 && (
            <LegacyBlock
              report={data}
              onExport={() =>
                exportRows('retencoes-historico', legacyCsvRows(data))
              }
            />
          )}

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
