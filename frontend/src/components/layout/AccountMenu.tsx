import {
  Avatar,
  Badge,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconKey, IconLogout } from '@tabler/icons-react';
import { useState } from 'react';
import { USER_ROLE_LABELS } from '../../api/types';
import { useAuth } from '../../auth/use-auth';
import { ChangePasswordModal } from '../../features/users/ChangePasswordModal';
import classes from './AccountMenu.module.css';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <>
      <Menu position="bottom-end" withinPortal shadow="md" width={240}>
        <Menu.Target>
          <UnstyledButton className={classes.trigger} aria-label="Sua conta">
            <Avatar size={28} radius="xl" color="blue" variant="light">
              {initials(user.name)}
            </Avatar>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Stack gap={4} px="sm" py="xs">
            <Text size="sm" fw={600} lh={1.3}>
              {user.name}
            </Text>
            <Text size="xs" c="dimmed" lh={1.3}>
              {user.email}
            </Text>
            <Group gap="xs" mt={4}>
              <Badge size="xs" variant="light">
                {USER_ROLE_LABELS[user.role]}
              </Badge>
            </Group>
          </Stack>

          <Menu.Divider />

          <Menu.Item
            leftSection={<IconKey size={15} />}
            onClick={() => setChangingPassword(true)}
          >
            Trocar senha
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<IconLogout size={15} />}
            onClick={() => void logout()}
          >
            Sair
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {changingPassword && (
        <ChangePasswordModal onClose={() => setChangingPassword(false)} />
      )}
    </>
  );
}
