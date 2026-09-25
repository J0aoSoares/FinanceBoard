import { Alert, Button, Group } from '@mantine/core';
import { IconDownload, IconInfoCircle } from '@tabler/icons-react';
import { useCompanies } from '../../hooks/use-catalog';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { formatMonth } from '../../lib/date';
import type { Regime } from '../../api/types';
import classes from './ReportHeader.module.css';

interface ReportEcho {
  regime: Regime;
  from: string;
  to: string;
  consolidated: boolean;
}

interface ReportHeaderProps {
  title: string;
  report: ReportEcho | undefined;
  onExport: () => void;
  exportDisabled: boolean;
}

export function ReportHeader({
  title,
  report,
  onExport,
  exportDisabled,
}: ReportHeaderProps) {
  const { global } = useGlobalFilters();
  const { data: companies } = useCompanies();

  const companyName = companies?.find(
    (company) => company.id === global.companyId,
  )?.legalName;

  return (
    <>
      <div className={classes.root}>
        <div>
          <h2 className={classes.title}>{title}</h2>
          {report && (
            <div className={classes.meta}>
              <span className={classes.scope}>
                {report.consolidated
                  ? 'Consolidado — todas as empresas'
                  : (companyName ?? 'Empresa selecionada')}
              </span>
              <span>
                {report.from === report.to
                  ? formatMonth(report.from)
                  : `${formatMonth(report.from)} a ${formatMonth(report.to)}`}
              </span>
              <span>
                ·{' '}
                {report.regime === 'accrual'
                  ? 'regime de competência'
                  : 'regime de caixa'}
              </span>
            </div>
          )}
        </div>

        <Group gap="xs">
          <Button
            size="xs"
            variant="default"
            leftSection={<IconDownload size={15} />}
            disabled={exportDisabled}
            onClick={onExport}
          >
            Exportar CSV
          </Button>
        </Group>
      </div>

      {report?.regime === 'cash' && (
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
          No regime de caixa só entram valores já liquidados: contas a pagar
          contam pela data de pagamento (ou do pagamento da fatura, quando
          faturadas) e recebíveis pela data de recebimento. Títulos em aberto
          não aparecem — o relatório fica legitimamente menor que em
          competência.
        </Alert>
      )}
    </>
  );
}
