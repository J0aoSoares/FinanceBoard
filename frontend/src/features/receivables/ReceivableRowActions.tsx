import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import {
  IconArrowBackUp,
  IconCashBanknote,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import type { Receivable } from '../../api/types';

interface ReceivableRowActionsProps {
  receivable: Receivable;
  onReceive: () => void;
  onReverse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ReceivableRowActions({
  receivable,
  onReceive,
  onReverse,
  onEdit,
  onDelete,
}: ReceivableRowActionsProps) {
  const received = receivable.status === 'PAID';

  return (
    <Menu position="bottom-end" withinPortal shadow="md">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Ações do recebível"
        >
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {received ? (
          <Menu.Item
            leftSection={<IconArrowBackUp size={15} />}
            onClick={onReverse}
          >
            Estornar recebimento
          </Menu.Item>
        ) : (
          <Menu.Item
            leftSection={<IconCashBanknote size={15} />}
            onClick={onReceive}
          >
            Registrar recebimento
          </Menu.Item>
        )}

        <Menu.Divider />

        <Tooltip
          label="Recebível já recebido não pode ser editado; estorne antes"
          disabled={!received}
          withArrow
        >
          <div>
            <Menu.Item
              leftSection={<IconPencil size={15} />}
              disabled={received}
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
