import { ActionIcon, CopyButton, Menu, Progress, Tooltip } from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconDotsVertical,
  IconTrash,
} from '@tabler/icons-react';
import { Fragment, useState } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import { StatusBadge } from '../../components/display/StatusBadge';
import { useAuth } from '../../auth/use-auth';
import { formatDate } from '../../lib/date';
import { formatDigitableLine } from '../../lib/digitable-line';
import { sumMoney } from '../../lib/money';
import type { Bill, BillGroupSummary } from '../../api/types';
import { BillRowActions } from './BillRowActions';
import classes from './BillsTable.module.css';

interface BillsTableProps {
  bills: Bill[];
  onPay: (bill: Bill) => void;
  onReverse: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onDeleteGroup: (group: BillGroupSummary, bills: Bill[]) => void;
}

type TableRow =
  | { kind: 'bill'; bill: Bill }
  | { kind: 'group'; group: BillGroupSummary; bills: Bill[] };

function buildRows(bills: Bill[]): TableRow[] {
  const rows: TableRow[] = [];
  const groups = new Map<string, Bill[]>();
  for (const bill of bills) {
    if (!bill.group) {
      rows.push({ kind: 'bill', bill });
      continue;
    }
    const members = groups.get(bill.group.id);
    if (members) {
      members.push(bill);
      continue;
    }
    const created = [bill];
    groups.set(bill.group.id, created);
    rows.push({ kind: 'group', group: bill.group, bills: created });
  }
  return rows;
}

function DigitableLineCopy({ line }: { line: string | null }) {
  if (!line) {
    return <span className={classes.secondary}>—</span>;
  }
  return (
    <CopyButton value={line} timeout={1500}>
      {({ copied, copy }) => (
        <Tooltip
          label={copied ? 'Copiada' : formatDigitableLine(line)}
          withArrow
          classNames={{ tooltip: 'fb-numeric' }}
        >
          <ActionIcon
            variant="subtle"
            color={copied ? 'teal' : 'gray'}
            aria-label="Copiar linha digitável"
            onClick={copy}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}

export function BillsTable({
  bills,
  onPay,
  onReverse,
  onEdit,
  onDelete,
  onDeleteGroup,
}: BillsTableProps) {
  const { canWrite } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  if (bills.length === 0) {
    return (
      <div className={classes.wrapper}>
        <p className={classes.empty}>
          Nenhum boleto encontrado para os filtros selecionados.
        </p>
      </div>
    );
  }

  const toggle = (groupId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });

  const total = sumMoney(bills.map((bill) => bill.netAmount));
  const columnCount = canWrite ? 10 : 9;

  const billCells = (bill: Bill, child: boolean) => (
    <>
      <td className={child ? classes.childCell : undefined}>
        {child ? (
          <span className={classes.position}>
            boleto {bill.installmentLabel} · {bill.group?.position}/
            {bill.group?.billCount}
          </span>
        ) : (
          <>
            {bill.supplier.name}
            <span className={classes.secondary}>{bill.company.legalName}</span>
          </>
        )}
      </td>
      <td>
        <span className={classes.document}>{bill.description}</span>
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
        <MoneyText value={bill.netAmount} />
      </td>
      <td className={classes.center}>
        <DigitableLineCopy line={bill.digitableLine} />
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
    </>
  );

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Obra</th>
            <th>Compra</th>
            <th>Vencimento</th>
            <th className={classes.numeric}>Valor</th>
            <th className={classes.center}>Linha</th>
            <th>Situação</th>
            {canWrite && <th />}
          </tr>
        </thead>

        <tbody>
          {buildRows(bills).map((row) => {
            if (row.kind === 'bill') {
              return <tr key={row.bill.id}>{billCells(row.bill, false)}</tr>;
            }

            const { group, bills: members } = row;
            const [first] = members;
            const open = expanded.has(group.id);
            const monthTotal = sumMoney(members.map((bill) => bill.netAmount));

            return (
              <Fragment key={group.id}>
                <tr className={classes.groupRow}>
                  <td>
                    <button
                      type="button"
                      className={classes.expand}
                      aria-expanded={open}
                      aria-label={
                        open ? 'Recolher boletos' : 'Expandir boletos'
                      }
                      onClick={() => toggle(group.id)}
                    >
                      {open ? (
                        <IconChevronDown size={16} />
                      ) : (
                        <IconChevronRight size={16} />
                      )}
                      <span>
                        {first.supplier.name}
                        <span className={classes.secondary}>
                          {first.company.legalName}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className={classes.document}>
                      {first.description}
                    </span>
                    <span className={classes.secondary}>
                      Parcelado em {group.billCount} boletos
                    </span>
                  </td>
                  <td>{first.category.name}</td>
                  <td>
                    {first.project ? (
                      first.project.name
                    ) : (
                      <span className={classes.secondary}>Administrativa</span>
                    )}
                  </td>
                  <td>{formatDate(first.issueDate)}</td>
                  <td>
                    <span className={classes.secondary}>
                      {members.length === 1
                        ? '1 boleto neste mês'
                        : `${members.length} boletos neste mês`}
                    </span>
                  </td>
                  <td className={classes.numeric}>
                    <MoneyText value={group.totalAmount} strong />
                    <span className={classes.secondary}>
                      no mês <MoneyText value={monthTotal} />
                    </span>
                  </td>
                  <td />
                  <td>
                    <span className={classes.progressLabel}>
                      {group.paidCount} de {group.billCount} pagos
                    </span>
                    <Progress
                      size="sm"
                      value={(group.paidCount / group.billCount) * 100}
                      aria-label={`${group.paidCount} de ${group.billCount} boletos pagos`}
                    />
                  </td>
                  {canWrite && (
                    <td>
                      <Menu position="bottom-end" withinPortal shadow="md">
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label="Ações do grupo"
                          >
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={15} />}
                            onClick={() => onDeleteGroup(group, members)}
                          >
                            Excluir grupo
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </td>
                  )}
                </tr>
                {open &&
                  members.map((bill) => (
                    <tr key={bill.id} className={classes.childRow}>
                      {billCells(bill, true)}
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>

        <tfoot>
          <tr className={classes.footer}>
            <td colSpan={6}>
              {bills.length} {bills.length === 1 ? 'boleto' : 'boletos'}
            </td>
            <td className={classes.numeric}>
              <MoneyText value={total} strong />
            </td>
            <td colSpan={columnCount - 7} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
