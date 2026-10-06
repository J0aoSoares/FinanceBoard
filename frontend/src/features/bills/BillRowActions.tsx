import { ActionIcon, Menu } from '@mantine/core';
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
  const paid = bill.effectiveStatus === 'PAID';

  return (
    <Menu position="bottom-end" withinPortal shadow="md">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="Ações do boleto">
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {paid ? (
          <Menu.Item
            leftSection={<IconArrowBackUp size={15} />}
            onClick={onReverse}
          >
            Estornar pagamento
          </Menu.Item>
        ) : (
          <Menu.Item leftSection={<IconCash size={15} />} onClick={onPay}>
            Registrar pagamento
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item leftSection={<IconPencil size={15} />} onClick={onEdit}>
          {paid ? 'Completar dados da NF' : 'Editar'}
        </Menu.Item>

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
