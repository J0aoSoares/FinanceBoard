import { Alert, Badge, Stack, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react';
import { Fragment, useState, type ReactNode } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import tableClasses from '../../components/display/DataTable.module.css';
import { useProjectResultsReport } from '../../hooks/use-reports';
import { useReportFilters } from '../../hooks/use-report-filters';
import { ApiError } from '../../lib/http';
import { csvMoney, downloadCsv, reportFileName } from '../../lib/csv';
import type { Money } from '../../lib/money';
import {
  PROJECT_STATUS_LABELS,
  type ProjectCost,
  type ProjectResultReport,
} from '../../api/types';
import { ReportEmptyState } from './ReportEmptyState';
import { ReportHeader } from './ReportHeader';
import { ReportSkeleton } from './ReportSkeleton';
import classes from './ProjectResultsReportPage.module.css';

const ZERO: Money = '0.00';
const toneOf = (value: Money) =>
  value.startsWith('-') ? 'outflow' : value === ZERO ? 'muted' : 'inflow';

const buildCsvRows = (report: ProjectResultReport) => {
  const header = [
    'Nível',
    'Obra',
    'Categoria',
    'Receita bruta',
    'Retenções',
    'Receita líquida',
    'Recebido',
    'A receber',
    'Custo',
    'Resultado',
  ];
  const categoryRows = (name: string, cost: ProjectCost) =>
    cost.byCategory.map((category) => [
      'Categoria',
      name,
      category.name,
      '',
      '',
      '',
      '',
      '',
      csvMoney(category.total),
      '',
    ]);

  return [
    header,
    ...report.projects.flatMap((project) => [
      [
        'Obra',
        project.name,
        '',
        csvMoney(project.revenue.grossAmount),
        csvMoney(project.revenue.withholdingTotal),
        csvMoney(project.revenue.netAmount),
        csvMoney(project.received),
        csvMoney(project.outstanding),
        csvMoney(project.cost.total),
        csvMoney(project.result),
      ],
      ...categoryRows(project.name, project.cost),
    ]),
    ...(report.unassignedRevenue
      ? [
          [
            'Sem obra',
            'Receitas sem obra (lançamentos anteriores)',
            '',
            csvMoney(report.unassignedRevenue.revenue.grossAmount),
            csvMoney(report.unassignedRevenue.revenue.withholdingTotal),
            csvMoney(report.unassignedRevenue.revenue.netAmount),
            csvMoney(report.unassignedRevenue.received),
            csvMoney(report.unassignedRevenue.outstanding),
            '',
            '',
          ],
        ]
      : []),
    [
      'Administrativo',
      'Despesas administrativas',
      '',
      '',
      '',
      '',
      '',
      '',
      csvMoney(report.administrative.total),
      '',
    ],
    ...categoryRows('Despesas administrativas', report.administrative),
    [
      'Consolidado',
      '',
      '',
      csvMoney(report.totals.revenue.grossAmount),
      csvMoney(report.totals.revenue.withholdingTotal),
      csvMoney(report.totals.revenue.netAmount),
      csvMoney(report.totals.received),
      csvMoney(report.totals.outstanding),
      csvMoney(report.totals.cost),
      csvMoney(report.totals.result),
    ],
  ];
};

function Card({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={classes.card}>
      <span className={classes.cardLabel}>{label}</span>
      {children}
      {hint && <span className={classes.cardHint}>{hint}</span>}
    </div>
  );
}

function CategoryRows({ cost }: { cost: ProjectCost }) {
  return (
    <>
      {cost.byCategory.map((category) => (
        <tr key={category.categoryId} className={classes.categoryRow}>
          <td className={classes.categoryName}>
            {category.name} · {category.billCount}{' '}
            {category.billCount === 1 ? 'boleto' : 'boletos'}
          </td>
          <td colSpan={5} />
          <td className={tableClasses.numeric}>
            <MoneyText value={category.total} />
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export function ProjectResultsReportPage() {
  const { filters, periodError } = useReportFilters();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const { data, isLoading, isError, error, isFetching } =
    useProjectResultsReport(filters);

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const handleExport = () => {
    if (data) {
      downloadCsv(
        reportFileName('resultado-por-obra', data.from, data.to, data.regime),
        buildCsvRows(data),
      );
    }
  };

  const empty =
    data &&
    data.projects.length === 0 &&
    data.unassignedRevenue === null &&
    data.administrative.billCount === 0;

  const expandButton = (key: string, label: ReactNode, open: boolean) => (
    <button
      type="button"
      className={classes.expand}
      aria-expanded={open}
      aria-label={open ? 'Recolher categorias' : 'Ver custo por categoria'}
      onClick={() => toggle(key)}
    >
      {open ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
      <span>{label}</span>
    </button>
  );

  return (
    <Stack gap="md">
      <ReportHeader
        title="Resultado por obra"
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
      ) : empty ? (
        <ReportEmptyState
          from={data.from}
          to={data.to}
          regime={data.regime}
          subject="lançamento"
        />
      ) : (
        <Stack gap="md">
          <div className={classes.cards}>
            <Card
              label="Receita líquida"
              hint={
                <>
                  Bruta <MoneyText value={data.totals.revenue.grossAmount} /> ·
                  retenções{' '}
                  <MoneyText value={data.totals.revenue.withholdingTotal} />
                </>
              }
            >
              <MoneyText
                value={data.totals.revenue.netAmount}
                strong
                withSymbol
              />
            </Card>
            <Card
              label="Recebido no período"
              hint={
                <>
                  A receber <MoneyText value={data.totals.outstanding} />
                </>
              }
            >
              <MoneyText
                value={data.totals.received}
                tone="inflow"
                strong
                withSymbol
              />
            </Card>
            <Card
              label="Custo total"
              hint={
                <>
                  Obras <MoneyText value={data.totals.projectCost} /> ·
                  administrativo{' '}
                  <MoneyText value={data.totals.administrativeCost} />
                </>
              }
            >
              <MoneyText
                value={data.totals.cost}
                tone="outflow"
                strong
                withSymbol
              />
            </Card>
            <Card label="Resultado consolidado" hint="Recebido − custo total">
              <MoneyText
                value={data.totals.result}
                tone={toneOf(data.totals.result)}
                strong
                withSymbol
              />
            </Card>
          </div>

          <div className={tableClasses.wrapper}>
            <table className={`${tableClasses.table} ${classes.dense}`}>
              <thead>
                <tr>
                  <th>Obra</th>
                  <th className={tableClasses.numeric}>Receita bruta</th>
                  <th className={tableClasses.numeric}>Retenções</th>
                  <th className={tableClasses.numeric}>Receita líquida</th>
                  <th className={tableClasses.numeric}>Recebido</th>
                  <th className={tableClasses.numeric}>A receber</th>
                  <th className={tableClasses.numeric}>Custo</th>
                  <th className={tableClasses.numeric}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((project) => {
                  const key = project.projectId ?? project.name;
                  const open = expanded.has(key);
                  return (
                    <Fragment key={key}>
                      <tr>
                        <td>
                          {expandButton(
                            key,
                            <>
                              {project.name}{' '}
                              {project.status === 'CLOSED' && (
                                <Badge size="xs" variant="light" color="gray">
                                  {PROJECT_STATUS_LABELS.CLOSED}
                                </Badge>
                              )}
                              <span className={tableClasses.secondary}>
                                {project.revenue.invoiceCount}{' '}
                                {project.revenue.invoiceCount === 1
                                  ? 'nota'
                                  : 'notas'}{' '}
                                · {project.cost.billCount}{' '}
                                {project.cost.billCount === 1
                                  ? 'boleto'
                                  : 'boletos'}
                              </span>
                            </>,
                            open,
                          )}
                        </td>
                        <td className={tableClasses.numeric}>
                          <MoneyText value={project.revenue.grossAmount} />
                        </td>
                        <td className={tableClasses.numeric}>
                          <MoneyText
                            value={project.revenue.withholdingTotal}
                            tone="muted"
                          />
                        </td>
                        <td className={tableClasses.numeric}>
                          <MoneyText value={project.revenue.netAmount} />
                        </td>
                        <td className={tableClasses.numeric}>
                          <MoneyText value={project.received} tone="inflow" />
                        </td>
                        <td className={tableClasses.numeric}>
                          <MoneyText value={project.outstanding} tone="muted" />
                        </td>
                        <td className={tableClasses.numeric}>
                          <MoneyText
                            value={project.cost.total}
                            tone="outflow"
                          />
                        </td>
                        <td className={tableClasses.numeric}>
                          <MoneyText
                            value={project.result}
                            tone={toneOf(project.result)}
                            strong
                          />
                        </td>
                      </tr>
                      {open && <CategoryRows cost={project.cost} />}
                    </Fragment>
                  );
                })}

                {data.unassignedRevenue && (
                  <tr className={classes.separateRow}>
                    <td>
                      Receitas sem obra (lançamentos anteriores)
                      <span className={tableClasses.secondary}>
                        Somadas só no consolidado
                      </span>
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText
                        value={data.unassignedRevenue.revenue.grossAmount}
                      />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText
                        value={data.unassignedRevenue.revenue.withholdingTotal}
                        tone="muted"
                      />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText
                        value={data.unassignedRevenue.revenue.netAmount}
                      />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText
                        value={data.unassignedRevenue.received}
                        tone="inflow"
                      />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText
                        value={data.unassignedRevenue.outstanding}
                        tone="muted"
                      />
                    </td>
                    <td colSpan={2} />
                  </tr>
                )}

                <tr className={classes.separateRow}>
                  <td>
                    {expandButton(
                      'administrative',
                      <>
                        Despesas administrativas (sem obra)
                        <span className={tableClasses.secondary}>
                          Fora do resultado das obras, somadas no consolidado
                        </span>
                      </>,
                      expanded.has('administrative'),
                    )}
                  </td>
                  <td colSpan={5} />
                  <td className={tableClasses.numeric}>
                    <MoneyText
                      value={data.administrative.total}
                      tone="outflow"
                    />
                  </td>
                  <td />
                </tr>
                {expanded.has('administrative') && (
                  <CategoryRows cost={data.administrative} />
                )}
              </tbody>
              <tfoot>
                <tr className={tableClasses.footer}>
                  <td>Consolidado</td>
                  <td className={tableClasses.numeric}>
                    <MoneyText value={data.totals.revenue.grossAmount} strong />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText
                      value={data.totals.revenue.withholdingTotal}
                      strong
                    />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText value={data.totals.revenue.netAmount} strong />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText value={data.totals.received} strong />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText value={data.totals.outstanding} strong />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText value={data.totals.cost} strong />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText
                      value={data.totals.result}
                      tone={toneOf(data.totals.result)}
                      strong
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <Text size="xs" c="dimmed">
            Receita pelas notas do período (
            {data.regime === 'cash' ? 'data de recebimento' : 'competência'}
            ); recebido pelo que entrou dentro do período; custo pelos boletos
            lançados na obra. Contas antigas com retenções entram pelo valor
            bruto.
          </Text>

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
