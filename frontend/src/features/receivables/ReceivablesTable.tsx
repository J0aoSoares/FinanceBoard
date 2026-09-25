import { MoneyText } from '../../components/display/MoneyText';
import { StatusBadge } from '../../components/display/StatusBadge';
import classes from '../../components/display/DataTable.module.css';
import { useAuth } from '../../auth/use-auth';
import { formatDate } from '../../lib/date';
import { sumMoney } from '../../lib/money';
import type { Receivable } from '../../api/types';
import { ReceivableRowActions } from './ReceivableRowActions';

interface ReceivablesTableProps {
  receivables: Receivable[];
  onReceive: (receivable: Receivable) => void;
  onReverse: (receivable: Receivable) => void;
  onEdit: (receivable: Receivable) => void;
  onDelete: (receivable: Receivable) => void;
}

export function ReceivablesTable({
  receivables,
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
          Nenhum recebível encontrado para os filtros selecionados.
        </p>
      </div>
    );
  }

  const total = sumMoney(receivables.map((receivable) => receivable.amount));

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Descrição</th>
            <th>Obra</th>
            <th>Emissão</th>
            <th>Vencimento</th>
            <th className={classes.numeric}>Valor</th>
            <th>Situação</th>
            {canWrite && <th className={classes.actions} />}
          </tr>
        </thead>

        <tbody>
          {receivables.map((receivable) => (
            <tr key={receivable.id}>
              <td>
                {receivable.clientName}
                <span className={classes.secondary}>
                  {receivable.company.legalName}
                </span>
              </td>
              <td>{receivable.description}</td>
              <td>
                {receivable.project ? (
                  receivable.project.name
                ) : (
                  <span className={classes.secondary}>Sem obra</span>
                )}
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
                <MoneyText value={receivable.amount} tone="inflow" />
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
            <td colSpan={5}>
              {receivables.length}{' '}
              {receivables.length === 1 ? 'recebível' : 'recebíveis'}
            </td>
            <td className={classes.numeric}>
              <MoneyText value={total} tone="inflow" strong />
            </td>
            <td colSpan={canWrite ? 2 : 1} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
