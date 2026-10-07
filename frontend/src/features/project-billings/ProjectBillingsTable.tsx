import { MoneyText } from '../../components/display/MoneyText';
import { StatusBadge } from '../../components/display/StatusBadge';
import classes from '../../components/display/DataTable.module.css';
import { useAuth } from '../../auth/use-auth';
import { formatDate } from '../../lib/date';
import { sumMoney } from '../../lib/money';
import {
  PROJECT_BILLING_STATUS_LABELS,
  type ProjectBilling,
} from '../../api/types';
import { ProjectBillingRowActions } from './ProjectBillingRowActions';

export interface ProjectBillingTableHandlers {
  onPay: (billing: ProjectBilling) => void;
  onReverse: (billing: ProjectBilling) => void;
  onEdit: (billing: ProjectBilling) => void;
  onDelete: (billing: ProjectBilling) => void;
}

interface ProjectBillingsTableProps extends ProjectBillingTableHandlers {
  billings: ProjectBilling[];
  showProject?: boolean;
}

export function ProjectBillingsTable({
  billings,
  showProject = true,
  onPay,
  onReverse,
  onEdit,
  onDelete,
}: ProjectBillingsTableProps) {
  const { canWrite } = useAuth();

  if (billings.length === 0) {
    return (
      <div className={classes.wrapper}>
        <p className={classes.empty}>
          Nenhuma fatura encontrada para os filtros selecionados.
        </p>
      </div>
    );
  }

  const totals = {
    amount: sumMoney(billings.map((billing) => billing.amount)),
    retainage: sumMoney(billings.map((billing) => billing.retainageAmount)),
    net: sumMoney(billings.map((billing) => billing.netAmount)),
  };
  const leadingColumns = showProject ? 4 : 3;

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Fatura</th>
            {showProject && <th>Obra</th>}
            <th>Empresa</th>
            <th>Vencimento</th>
            <th className={classes.numeric}>Valor</th>
            <th className={classes.numeric}>Caução</th>
            <th className={classes.numeric}>Líquido</th>
            <th>Pagamento</th>
            <th>Banco</th>
            <th>Situação</th>
            {canWrite && <th className={classes.actions} />}
          </tr>
        </thead>

        <tbody>
          {billings.map((billing) => (
            <tr key={billing.id}>
              <td>{billing.number}</td>
              {showProject && (
                <td>
                  {billing.project.name}
                  <span className={classes.secondary}>
                    {billing.project.clientName}
                  </span>
                </td>
              )}
              <td>{billing.company.legalName}</td>
              <td>{formatDate(billing.dueDate)}</td>
              <td className={classes.numeric}>
                <MoneyText value={billing.amount} />
              </td>
              <td className={classes.numeric}>
                <MoneyText value={billing.retainageAmount} tone="muted" />
                {billing.retainagePercent && (
                  <span className={classes.secondary}>
                    {billing.retainagePercent.replace('.', ',')}%
                  </span>
                )}
              </td>
              <td className={classes.numeric}>
                <MoneyText value={billing.netAmount} tone="inflow" strong />
              </td>
              <td>{formatDate(billing.paymentDate)}</td>
              <td>{billing.bank?.name ?? '—'}</td>
              <td>
                <StatusBadge
                  status={billing.effectiveStatus}
                  labels={PROJECT_BILLING_STATUS_LABELS}
                />
              </td>
              {canWrite && (
                <td className={classes.actions}>
                  <ProjectBillingRowActions
                    billing={billing}
                    onPay={() => onPay(billing)}
                    onReverse={() => onReverse(billing)}
                    onEdit={() => onEdit(billing)}
                    onDelete={() => onDelete(billing)}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className={classes.footer}>
            <td colSpan={leadingColumns}>
              {billings.length} {billings.length === 1 ? 'fatura' : 'faturas'}
            </td>
            <td className={classes.numeric}>
              <MoneyText value={totals.amount} strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={totals.retainage} strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={totals.net} tone="inflow" strong />
            </td>
            <td colSpan={canWrite ? 4 : 3} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
