import { Tooltip } from '@mantine/core';
import { MoneyText } from '../../components/display/MoneyText';
import { StatusBadge } from '../../components/display/StatusBadge';
import classes from '../../components/display/DataTable.module.css';
import { useAuth } from '../../auth/use-auth';
import { formatDate } from '../../lib/date';
import { formatCurrency, sumMoney } from '../../lib/money';
import { TAX_TYPE_LABELS, type Receivable } from '../../api/types';
import { ReceivableRowActions } from './ReceivableRowActions';

interface ReceivablesTableProps {
  receivables: Receivable[];
  showProject?: boolean;
  onReceive: (receivable: Receivable) => void;
  onReverse: (receivable: Receivable) => void;
  onEdit: (receivable: Receivable) => void;
  onDelete: (receivable: Receivable) => void;
}

const withholdingSummary = (receivable: Receivable) =>
  receivable.withholdings
    .map(
      (withholding) =>
        `${TAX_TYPE_LABELS[withholding.type]}: ${formatCurrency(withholding.amount)}`,
    )
    .join(' · ');

export function ReceivablesTable({
  receivables,
  showProject = true,
  onReceive,
  onReverse,
  onEdit,
  onDelete,
}: ReceivablesTableProps) {
  const { canWrite } = useAuth();

  if (receivables.length === 0) {
    return (
      <div className={classes.wrapper}>
        <p className={classes.empty}>
          Nenhuma nota de serviço encontrada para os filtros selecionados.
        </p>
      </div>
    );
  }

  const totals = {
    gross: sumMoney(receivables.map((receivable) => receivable.grossAmount)),
    withholdings: sumMoney(
      receivables.map((receivable) => receivable.withholdingTotal),
    ),
    net: sumMoney(receivables.map((receivable) => receivable.netAmount)),
  };
  const leadingColumns = showProject ? 5 : 4;

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Número</th>
            {showProject && <th>Obra</th>}
            <th>Tomador</th>
            <th>Emissão</th>
            <th>Vencimento</th>
            <th className={classes.numeric}>Bruto</th>
            <th className={classes.numeric}>Retenções</th>
            <th className={classes.numeric}>Líquido</th>
            <th>Situação</th>
            {canWrite && <th className={classes.actions} />}
          </tr>
        </thead>

        <tbody>
          {receivables.map((receivable) => (
            <tr key={receivable.id}>
              <td>
                {receivable.number ?? (
                  <span className={classes.secondary}>Sem número</span>
                )}
                <span className={classes.secondary}>
                  {receivable.description}
                </span>
              </td>
              {showProject && (
                <td>
                  {receivable.project ? (
                    receivable.project.name
                  ) : (
                    <span className={classes.secondary}>Sem obra</span>
                  )}
                </td>
              )}
              <td>
                {receivable.clientName}
                <span className={classes.secondary}>
                  {receivable.company.legalName}
                </span>
              </td>
              <td>{formatDate(receivable.issueDate)}</td>
              <td>
                {formatDate(receivable.dueDate)}
                {receivable.receiptDate && (
                  <span className={classes.secondary}>
                    Recebido em {formatDate(receivable.receiptDate)}
                  </span>
                )}
              </td>
              <td className={classes.numeric}>
                <MoneyText value={receivable.grossAmount} />
              </td>
              <td className={classes.numeric}>
                {receivable.withholdings.length > 0 ? (
                  <Tooltip label={withholdingSummary(receivable)} withArrow>
                    <span>
                      <MoneyText
                        value={receivable.withholdingTotal}
                        tone="outflow"
                      />
                    </span>
                  </Tooltip>
                ) : (
                  <MoneyText value={receivable.withholdingTotal} />
                )}
              </td>
              <td className={classes.numeric}>
                <MoneyText value={receivable.netAmount} tone="inflow" strong />
              </td>
              <td>
                <StatusBadge status={receivable.effectiveStatus} />
              </td>
              {canWrite && (
                <td className={classes.actions}>
                  <ReceivableRowActions
                    receivable={receivable}
                    onReceive={() => onReceive(receivable)}
                    onReverse={() => onReverse(receivable)}
                    onEdit={() => onEdit(receivable)}
                    onDelete={() => onDelete(receivable)}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className={classes.footer}>
            <td colSpan={leadingColumns}>
              {receivables.length} {receivables.length === 1 ? 'nota' : 'notas'}
            </td>
            <td className={classes.numeric}>
              <MoneyText value={totals.gross} strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={totals.withholdings} strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={totals.net} tone="inflow" strong />
            </td>
            <td colSpan={canWrite ? 2 : 1} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
