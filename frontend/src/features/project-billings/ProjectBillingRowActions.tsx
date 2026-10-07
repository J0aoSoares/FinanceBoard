import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import {
  IconArrowBackUp,
  IconCashBanknote,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import type { ProjectBilling } from '../../api/types';

interface ProjectBillingRowActionsProps {
  billing: ProjectBilling;
  onPay: () => void;
  onReverse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectBillingRowActions({
  billing,
  onPay,
  onReverse,
  onEdit,
  onDelete,
}: ProjectBillingRowActionsProps) {
  const paid = billing.paymentDate !== null;

  return (
    <Menu position="bottom-end" withinPortal shadow="md">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="Ações da fatura">
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
          <Menu.Item
            leftSection={<IconCashBanknote size={15} />}
            onClick={onPay}
          >
            Registrar pagamento
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item leftSection={<IconPencil size={15} />} onClick={onEdit}>
          Editar
        </Menu.Item>

        <Tooltip
          label="Fatura paga não pode ser excluída; estorne o pagamento antes"
          disabled={!paid}
          withArrow
        >
          <div>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={15} />}
              disabled={paid}
              onClick={onDelete}
            >
              Excluir
            </Menu.Item>
          </div>
        </Tooltip>
      </Menu.Dropdown>
    </Menu>
  );
}
