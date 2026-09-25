import { AppShell, Group } from '@mantine/core';
import { IconBuildingFactory2 } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import classes from './AppLayout.module.css';

interface AppHeaderProps {
  children?: ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <AppShell.Header>
      <div className={classes.header}>
        <div className={classes.brand}>
          <IconBuildingFactory2 size={22} className={classes.brandMark} />
          FinanceBoard
        </div>
        <Group gap="md" wrap="nowrap">
          {children}
          <ColorSchemeToggle />
        </Group>
      </div>
    </AppShell.Header>
  );
}
