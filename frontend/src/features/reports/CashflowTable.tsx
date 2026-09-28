import { MoneyText } from '../../components/display/MoneyText';
import classes from '../../components/display/DataTable.module.css';
import { formatMonth } from '../../lib/date';
import type { CashflowReport } from '../../api/types';
import type { Money } from '../../lib/money';

interface CashflowTableProps {
  report: CashflowReport;
}

const isNegative = (value: Money) => value.startsWith('-');

export function CashflowTable({ report }: CashflowTableProps) {
  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Mês</th>
            <th className={classes.numeric}>Faturado bruto</th>
            <th className={classes.numeric}>Retenções sofridas</th>
            <th className={classes.numeric}>Entradas líquidas</th>
            <th className={classes.numeric}>Saídas</th>
            <th className={classes.numeric}>Saldo</th>
            <th className={classes.numeric}>Acumulado</th>
          </tr>
        </thead>

        <tbody>
          {report.months.map((month) => (
            <tr key={month.month}>
              <td>{formatMonth(month.month)}</td>
              <td className={classes.numeric}>
                <MoneyText value={month.inflowGross} />
              </td>
              <td className={classes.numeric}>
                <MoneyText value={month.inflowWithholdings} tone="muted" />
              </td>
              <td className={classes.numeric}>
                <MoneyText value={month.inflow} tone="inflow" />
              </td>
              <td className={classes.numeric}>
                <MoneyText value={month.outflow} tone="outflow" />
              </td>
              <td className={classes.numeric}>
                <MoneyText
                  value={month.balance}
                  tone={isNegative(month.balance) ? 'outflow' : 'inflow'}
                />
              </td>
              <td className={classes.numeric}>
                <MoneyText
                  value={month.accumulatedBalance}
                  tone={
                    isNegative(month.accumulatedBalance) ? 'outflow' : 'default'
                  }
                  strong
                />
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className={classes.footer}>
            <td>Total do período</td>
            <td className={classes.numeric}>
              <MoneyText value={report.totals.inflowGross} strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText
                value={report.totals.inflowWithholdings}
                tone="muted"
                strong
              />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={report.totals.inflow} tone="inflow" strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText value={report.totals.outflow} tone="outflow" strong />
            </td>
            <td className={classes.numeric}>
              <MoneyText
                value={report.totals.balance}
                tone={isNegative(report.totals.balance) ? 'outflow' : 'inflow'}
                strong
              />
            </td>
            <td className={classes.numeric} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
