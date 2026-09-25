import { IconArrowNarrowRight } from '@tabler/icons-react';
import { MoneyText } from '../../components/display/MoneyText';
import tableClasses from '../../components/display/DataTable.module.css';
import { apiDate, formatDate, formatMonth, monthOf } from '../../lib/date';
import { subtractMoney } from '../../lib/money';
import type { Invoice, InvoiceBill, Regime } from '../../api/types';
import classes from './InvoiceBillsTable.module.css';

interface InvoiceBillsTableProps {
  invoice: Invoice;
  regime: Regime;
}

const monthOfTimestamp = (timestamp: string | null) => {
  const date = apiDate(timestamp);
  return date ? monthOf(date) : null;
};

function CompetenceShift({
  origin,
  effective,
}: {
  origin: string | null;
  effective: string | null;
}) {
  if (!effective) {
    return (
      <span className={`${classes.shift} ${classes.undefined}`}>
        definida ao pagar
      </span>
    );
  }

  if (!origin || origin === effective) {
    return (
      <span className={`${classes.shift} ${classes.same}`}>
        {formatMonth(effective)}
      </span>
    );
  }

  return (
    <span className={`${classes.shift} ${classes.shifted}`}>
      <span className={classes.origin}>{formatMonth(origin)}</span>
      <IconArrowNarrowRight size={14} />
      <span>{formatMonth(effective)}</span>
    </span>
  );
}

export function InvoiceBillsTable({ invoice, regime }: InvoiceBillsTableProps) {
  const effectiveMonth =
    regime === 'cash'
      ? monthOfTimestamp(invoice.paymentDate)
      : monthOfTimestamp(invoice.dueDate);

  if (invoice.bills.length === 0) {
    return (
      <div className={tableClasses.wrapper}>
        <p className={tableClasses.empty}>
          Esta fatura ainda não possui contas. Use &quot;Gerenciar
          composição&quot; para incluí-las.
        </p>
      </div>
    );
  }

  const withholdingOf = (bill: InvoiceBill) =>
    subtractMoney(bill.grossAmount, bill.netAmount);

  return (
    <div className={tableClasses.wrapper}>
      <table className={tableClasses.table}>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>Documento</th>
            <th>Categoria</th>
            <th>Obra</th>
            <th>Emissão</th>
            <th>Competência</th>
            <th className={tableClasses.numeric}>Bruto</th>
            <th className={tableClasses.numeric}>Retenções</th>
            <th className={tableClasses.numeric}>Líquido</th>
          </tr>
        </thead>

        <tbody>
          {invoice.bills.map((bill) => (
            <tr key={bill.id}>
              <td>{bill.supplier.name}</td>
              <td>{bill.documentNumber}</td>
              <td>{bill.category.name}</td>
              <td>
                {bill.project ? (
                  bill.project.name
                ) : (
                  <span className={tableClasses.secondary}>Administrativa</span>
                )}
              </td>
              <td>{formatDate(bill.issueDate)}</td>
              <td>
                <CompetenceShift
                  origin={monthOfTimestamp(bill.issueDate)}
                  effective={effectiveMonth}
                />
              </td>
              <td className={tableClasses.numeric}>
                <MoneyText value={bill.grossAmount} />
              </td>
              <td className={tableClasses.numeric}>
                <MoneyText value={withholdingOf(bill)} tone="muted" />
              </td>
              <td className={tableClasses.numeric}>
                <MoneyText value={bill.netAmount} tone="outflow" />
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className={tableClasses.footer}>
            <td colSpan={6}>
              {invoice.billCount} {invoice.billCount === 1 ? 'conta' : 'contas'}
            </td>
            <td className={tableClasses.numeric}>
              <MoneyText value={invoice.grossTotal} strong />
            </td>
            <td className={tableClasses.numeric}>
              <MoneyText value={invoice.withholdingTotal} tone="muted" strong />
            </td>
            <td className={tableClasses.numeric}>
              <MoneyText value={invoice.netTotal} tone="outflow" strong />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
