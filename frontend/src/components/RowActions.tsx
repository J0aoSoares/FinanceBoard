import { ActionIcon, Menu } from '@mantine/core';
import { IconDotsVertical, IconPencil, IconTrash } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface RowActionsProps {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
  deleteLabel?: string;
  deleteIcon?: ReactNode;
  deleteDisabled?: boolean;
}

export function RowActions({
  label,
  onEdit,
  onDelete,
  children,
  deleteLabel = 'Excluir',
  deleteIcon,
  deleteDisabled = false,
}: RowActionsProps) {
  return (
    <Menu position="bottom-end" withinPortal shadow="md">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={label}>
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={15} />} onClick={onEdit}>
          Editar
        </Menu.Item>
        {children}
        <Menu.Item
          color="red"
          leftSection={deleteIcon ?? <IconTrash size={15} />}
          onClick={onDelete}
          disabled={deleteDisabled}
        >
          {deleteLabel}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
