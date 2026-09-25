import { MoneyText } from '../../components/display/MoneyText';
import { StatusBadge } from '../../components/display/StatusBadge';
import { useAuth } from '../../auth/use-auth';
import { formatDate } from '../../lib/date';
import { sumMoney } from '../../lib/money';
import type { Bill } from '../../api/types';
import { BillRowActions } from './BillRowActions';
import classes from './BillsTable.module.css';

interface BillsTableProps {
  bills: Bill[];
  onPay: (bill: Bill) => void;
  onReverse: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

export function BillsTable({
  bills,
  onPay,
  onReverse,
  onEdit,
  onDelete,
}: BillsTableProps) {
  const { canWrite } = useAuth();

  if (bills.length === 0) {
    return (
      <div className={classes.wrapper}>
        <p className={classes.empty}>
          Nenhuma conta encontrada para os filtros selecionados.
        </p>
      </div>
    );
  }

  const grossTotal = sumMoney(bills.map((bill) => bill.grossAmount));
  const netTotal = sumMoney(bills.map((bill) => bill.netAmount));

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>Documento</th>
            <th>Categoria</th>
            <th>Obra</th>
            <th>Emissão</th>
            <th>Vencimento</th>
            <th className={classes.numeric}>Bruto</th>
            <th className={classes.numeric}>Líquido</th>
            <th>Situação</th>
            {canWrite && <th />}
          </tr>
        </thead>

        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id}>
              <td>
                {bill.supplier.name}
                <span className={classes.secondary}>
                  {bill.company.legalName}
                </span>
              </td>
              <td>
                <span className={classes.document}>{bill.documentNumber}</span>
                {bill.invoice && (
                  <span className={classes.invoiceTag}>
                    Fatura {bill.invoice.number}
                  </span>
                )}
              </td>
              <td>{bill.category.name}</td>
              <td>
                {bill.project ? (
                  bill.project.name
                ) : (
                  <span className={classes.secondary}>Administrativa</span>
                )}
              </td>
              <td>{formatDate(bill.issueDate)}</td>
              <td>
                {formatDate(bill.effectiveDueDate)}
                {bill.paymentDate && (
                  <span className={classes.secondary}>
                    Pago em {formatDate(bill.paymentDate)}
                  </span>
                )}
              </td>
              <td className={classes.numeric}>
                <MoneyText value={bill.grossAmount} />
              </td>
              <td className={classes.numeric}>
                <MoneyText
                  value={bill.netAmount}
                  tone={bill.hasTaxWithholding ? 'outflow' : 'default'}
                />
              </td>
              <td>
                <StatusBadge status={bill.effectiveStatus} />
              </td>
              {canWrite && (
                <td>
                  <BillRowActions
                    bill={bill}
                    onPay={() => onPay(bill)}
                    onReverse={() => onReverse(bill)}
                    onEdit={() => onEdit(bill)}
                    onDelete={() => onDelete(bill)}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className={classes.footer}>
            <td colSpan={6}>
              {bills.length} {bills.length === 1 ? 'conta' : 'contas'}
            </td>
            <td className={classes.numeric}>
              <MoneyText value={grossTotal} strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={netTotal} strong />
            </td>
            <td colSpan={canWrite ? 2 : 1} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
