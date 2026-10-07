import { Group, Stack, Text } from '@mantine/core';
import { MoneyText } from '../../components/display/MoneyText';
import tableClasses from '../../components/display/DataTable.module.css';
import type {
  ProjectBillingDateBasis,
  ProjectBillingTotals,
} from '../../api/types';
import classes from './ProjectBillingTotalsPanel.module.css';

interface ProjectBillingTotalsPanelProps {
  totals: ProjectBillingTotals;
  dateBasis: ProjectBillingDateBasis;
}

function Figure({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={classes.figure}>
      <span className={classes.label}>{label}</span>
      {children}
      {hint && <span className={classes.hint}>{hint}</span>}
    </div>
  );
}

export function ProjectBillingTotalsPanel({
  totals,
  dateBasis,
}: ProjectBillingTotalsPanelProps) {
  return (
    <Stack gap="sm">
      <div className={classes.figures}>
        <Figure
          label="Total faturado"
          hint={`${totals.billingCount} ${totals.billingCount === 1 ? 'fatura' : 'faturas'}`}
        >
          <MoneyText value={totals.invoiced} strong withSymbol />
        </Figure>
        <Figure label="Caução retida" hint="Devolvida depois pela obra">
          <MoneyText value={totals.retainage} strong withSymbol tone="muted" />
        </Figure>
        <Figure
          label="Total recebido"
          hint={`Líquido de ${totals.paidCount} ${totals.paidCount === 1 ? 'fatura paga' : 'faturas pagas'}`}
        >
          <MoneyText value={totals.received} strong withSymbol tone="inflow" />
        </Figure>
        <Figure
          label="Caução devolvida"
          hint={`${totals.releaseCount} ${totals.releaseCount === 1 ? 'devolução' : 'devoluções'} no período`}
        >
          <MoneyText
            value={totals.retainageReleased}
            strong
            withSymbol
            tone="inflow"
          />
        </Figure>
      </div>

      <Stack gap={4}>
        <Group justify="space-between" align="baseline">
          <Text fw={600} size="sm">
            Recebido por banco
          </Text>
          {dateBasis === 'due' && (
            <Text size="xs" c="dimmed">
              Para conferir com o extrato, filtre o mês pelo pagamento.
            </Text>
          )}
        </Group>
        <div className={tableClasses.wrapper}>
          {totals.receivedByBank.length === 0 ? (
            <p className={tableClasses.empty}>
              Nenhum recebimento no período e filtros selecionados.
            </p>
          ) : (
            <table className={tableClasses.table}>
              <thead>
                <tr>
                  <th>Banco</th>
                  <th className={tableClasses.numeric}>Faturas pagas</th>
                  <th className={tableClasses.numeric}>Caução devolvida</th>
                  <th className={tableClasses.numeric}>Total</th>
                </tr>
              </thead>
              <tbody>
                {totals.receivedByBank.map((bank) => (
                  <tr key={bank.bankId}>
                    <td>
                      {bank.bankName}
                      <span className={tableClasses.secondary}>
                        {bank.bankCode}
                      </span>
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bank.billings} />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bank.retainageReleases} />
                    </td>
                    <td className={tableClasses.numeric}>
                      <MoneyText value={bank.total} tone="inflow" strong />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={tableClasses.footer}>
                  <td>Total</td>
                  <td className={tableClasses.numeric}>
                    <MoneyText value={totals.received} strong />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText value={totals.retainageReleased} strong />
                  </td>
                  <td className={tableClasses.numeric}>
                    <MoneyText
                      value={totals.totalReceived}
                      tone="inflow"
                      strong
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </Stack>
    </Stack>
  );
}
