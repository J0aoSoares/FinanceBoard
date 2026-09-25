import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

export function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme({
    keepTransitions: true,
  });

  const isDark = colorScheme === 'dark';

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
      onClick={toggleColorScheme}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
