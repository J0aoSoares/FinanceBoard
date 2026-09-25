import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import {
  IconArrowBackUp,
  IconCash,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import type { Bill } from '../../api/types';

interface BillRowActionsProps {
  bill: Bill;
  onPay: () => void;
  onReverse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function BillRowActions({
  bill,
  onPay,
  onReverse,
  onEdit,
  onDelete,
}: BillRowActionsProps) {
  const invoiced = bill.invoice !== null;
  const paid = bill.effectiveStatus === 'PAID';

  const payLabel = invoiced
    ? 'Conta faturada: o pagamento é registrado na fatura'
    : 'Registrar pagamento';

  return (
    <Menu position="bottom-end" withinPortal shadow="md">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="Ações da conta">
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {paid ? (
          <Menu.Item
            leftSection={<IconArrowBackUp size={15} />}
            disabled={invoiced}
            onClick={onReverse}
          >
            Estornar pagamento
          </Menu.Item>
        ) : (
          <Tooltip label={payLabel} disabled={!invoiced} withArrow>
            <div>
              <Menu.Item
                leftSection={<IconCash size={15} />}
                disabled={invoiced}
                onClick={onPay}
              >
                Registrar pagamento
              </Menu.Item>
            </div>
          </Tooltip>
        )}

        <Menu.Divider />

        <Tooltip
          label="Conta paga não pode ser editada; estorne antes"
          disabled={!paid}
          withArrow
        >
          <div>
            <Menu.Item
              leftSection={<IconPencil size={15} />}
              disabled={paid}
              onClick={onEdit}
            >
              Editar
            </Menu.Item>
          </div>
        </Tooltip>

        <Menu.Item
          color="red"
          leftSection={<IconTrash size={15} />}
          onClick={onDelete}
        >
          Excluir
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
