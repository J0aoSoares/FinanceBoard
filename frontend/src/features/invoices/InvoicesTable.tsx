import { Link } from 'react-router-dom';
import { MoneyText } from '../../components/display/MoneyText';
import { StatusBadge } from '../../components/display/StatusBadge';
import classes from '../../components/display/DataTable.module.css';
import { formatDate } from '../../lib/date';
import { sumMoney } from '../../lib/money';
import type { Invoice } from '../../api/types';

interface InvoicesTableProps {
  invoices: Invoice[];
  search: string;
  emptyMessage: string;
}

export function InvoicesTable({
  invoices,
  search,
  emptyMessage,
}: InvoicesTableProps) {
  if (invoices.length === 0) {
    return (
      <div className={classes.wrapper}>
        <p className={classes.empty}>{emptyMessage}</p>
      </div>
    );
  }

  const grossTotal = sumMoney(invoices.map((invoice) => invoice.grossTotal));
  const withholdingTotal = sumMoney(
    invoices.map((invoice) => invoice.withholdingTotal),
  );
  const netTotal = sumMoney(invoices.map((invoice) => invoice.netTotal));

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Número</th>
            <th>Empresa</th>
            <th>Fornecedor</th>
            <th>Vencimento</th>
            <th className={classes.numeric}>Contas</th>
            <th className={classes.numeric}>Bruto</th>
            <th className={classes.numeric}>Retenções</th>
            <th className={classes.numeric}>Líquido</th>
            <th>Situação</th>
          </tr>
        </thead>

        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <Link to={{ pathname: `/invoices/${invoice.id}`, search }}>
                  {invoice.number}
                </Link>
              </td>
              <td>{invoice.company.legalName}</td>
              <td>
                {invoice.supplier ? (
                  invoice.supplier.name
                ) : (
                  <span className={classes.secondary}>Não informado</span>
                )}
              </td>
              <td>
                {formatDate(invoice.dueDate)}
                {invoice.paymentDate && (
                  <span className={classes.secondary}>
                    Pago em {formatDate(invoice.paymentDate)}
                  </span>
                )}
              </td>
              <td className={classes.numeric}>{invoice.billCount}</td>
              <td className={classes.numeric}>
                <MoneyText value={invoice.grossTotal} />
              </td>
              <td className={classes.numeric}>
                <MoneyText value={invoice.withholdingTotal} tone="muted" />
              </td>
              <td className={classes.numeric}>
                <MoneyText value={invoice.netTotal} tone="outflow" />
              </td>
              <td>
                <StatusBadge status={invoice.effectiveStatus} />
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className={classes.footer}>
            <td colSpan={5}>
              {invoices.length} {invoices.length === 1 ? 'fatura' : 'faturas'}
            </td>
            <td className={classes.numeric}>
              <MoneyText value={grossTotal} strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={withholdingTotal} tone="muted" strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={netTotal} tone="outflow" strong />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
