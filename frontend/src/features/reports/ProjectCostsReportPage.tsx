import {
  Alert,
  Badge,
  Button,
  Collapse,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import { useProjectCostsReport } from '../../hooks/use-reports';
import { useReportFilters } from '../../hooks/use-report-filters';
import { ApiError } from '../../lib/http';
import { csvMoney, downloadCsv, reportFileName } from '../../lib/csv';
import {
  PROJECT_STATUS_LABELS,
  type ProjectCostEntry,
  type ProjectCostReport,
} from '../../api/types';
import { ReportEmptyState } from './ReportEmptyState';
import { ReportHeader } from './ReportHeader';
import { ReportSkeleton } from './ReportSkeleton';
import classes from './ProjectCostsReportPage.module.css';

const buildCsvRows = (report: ProjectCostReport) => {
  const rows: string[][] = [
    [
      'Nível',
      'Obra',
      'Cliente',
      'Situação',
      'Categoria',
      'Contas',
      'Bruto',
      'Líquido',
      'Participação (%)',
    ],
  ];

  for (const project of report.projects) {
    rows.push([
      'Obra',
      project.name,
      project.clientName ?? '',
      project.status ? PROJECT_STATUS_LABELS[project.status] : '',
      '',
      String(project.billCount),
      csvMoney(project.grossTotal),
      csvMoney(project.netTotal),
      project.shareOfTotal.replace('.', ','),
    ]);

    for (const category of project.byCategory) {
      rows.push([
        'Categoria',
        project.name,
        '',
        '',
        category.name,
        String(category.billCount),
        csvMoney(category.grossTotal),
        '',
        '',
      ]);
    }
  }

  rows.push([
    'Total',
    '',
    '',
    '',
    '',
    String(report.totals.billCount),
    csvMoney(report.totals.grossTotal),
    csvMoney(report.totals.netTotal),
    '',
  ]);

  return rows;
};

function ProjectRow({ project }: { project: ProjectCostEntry }) {
  const [open, setOpen] = useState(false);
  const isAdministrative = project.projectId === null;
  const share = Math.max(0, Math.min(100, Number(project.shareOfTotal)));

  return (
    <div
      className={`${classes.item} ${isAdministrative ? classes.administrative : ''}`}
    >
      <div className={classes.head}>
        <div>
          <span className={classes.name}>{project.name}</span>
          <div className={classes.meta}>
            {isAdministrative
              ? 'Contas sem obra vinculada'
              : (project.clientName ?? 'Cliente não informado')}
            {' · '}
            {project.billCount} {project.billCount === 1 ? 'conta' : 'contas'}
            {project.status && (
              <>
                {' · '}
                <Badge
                  size="xs"
                  variant="light"
                  radius="xl"
                  color={project.status === 'ACTIVE' ? 'green' : 'gray'}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className={classes.amounts}>
          <span className={classes.share}>
            {project.shareOfTotal.replace('.', ',')}%
          </span>
          <MoneyText value={project.grossTotal} strong withSymbol />
        </div>
      </div>

      <div className={classes.track}>
        <div
          className={`${classes.bar} ${isAdministrative ? classes.barAdministrative : ''}`}
          style={{ width: `${share}%` }}
        />
      </div>

      <Group justify="space-between" align="center" mt="xs">
        <Button
          variant="subtle"
          size="compact-xs"
          color="gray"
          leftSection={
            <IconChevronRight
              size={14}
              style={{
                transform: open ? 'rotate(90deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
          }
          onClick={() => setOpen((previous) => !previous)}
        >
          {project.byCategory.length}{' '}
          {project.byCategory.length === 1 ? 'categoria' : 'categorias'}
        </Button>
        <Text size="xs" c="dimmed">
          Líquido <MoneyText value={project.netTotal} tone="muted" />
        </Text>
      </Group>

      <Collapse expanded={open}>
        <div className={classes.categories}>
          {project.byCategory.map((category) => (
            <div key={category.categoryId} className={classes.categoryRow}>
              <span>
                {category.name}
                {' · '}
                {category.billCount}{' '}
                {category.billCount === 1 ? 'conta' : 'contas'}
              </span>
              <MoneyText value={category.grossTotal} />
            </div>
          ))}
        </div>
      </Collapse>
    </div>
  );
}

export function ProjectCostsReportPage() {
  const { filters, periodError } = useReportFilters();
  const { data, isLoading, isError, error, isFetching } =
    useProjectCostsReport(filters);

  const handleExport = () => {
    if (!data) {
      return;
    }
    downloadCsv(
      reportFileName('custo-por-obra', data.from, data.to, data.regime),
      buildCsvRows(data),
    );
  };

  return (
    <Stack gap="md">
      <ReportHeader
        title="Custo por obra"
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
        <ReportSkeleton rows={5} />
      ) : data.projects.length === 0 ? (
        <ReportEmptyState
          from={data.from}
          to={data.to}
          regime={data.regime}
          subject="custo"
        />
      ) : (
        <Stack gap="md">
          <Group justify="space-between" align="baseline">
            <Text size="xs" c="dimmed">
              {data.totals.billCount}{' '}
              {data.totals.billCount === 1 ? 'conta' : 'contas'} no período ·
              participação calculada sobre o valor bruto
            </Text>
            <Group gap="xs" align="baseline">
              <Text size="xs" c="dimmed">
                Total bruto
              </Text>
              <MoneyText value={data.totals.grossTotal} strong withSymbol />
            </Group>
          </Group>

          <div className={classes.list}>
            {data.projects.map((project) => (
              <ProjectRow
                key={project.projectId ?? 'without-project'}
                project={project}
              />
            ))}
          </div>

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
