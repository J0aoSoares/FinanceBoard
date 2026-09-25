import { ActionIcon, AppShell, Tooltip } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { AccountMenu } from './AccountMenu';
import { AppHeader } from './AppHeader';
import { GlobalFilterBar } from './GlobalFilterBar';
import { TopNavigation } from '../navigation/TopNavigation';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import classes from './AppLayout.module.css';

export function AppLayout() {
  const { globalSearch } = useGlobalFilters();

  return (
    <AppShell header={{ height: 'var(--fb-header-height)' }}>
      <AppHeader>
        <GlobalFilterBar />
        <Tooltip label="Cadastros" withArrow>
          <ActionIcon
            component={Link}
            to={{ pathname: '/companies', search: globalSearch }}
            variant="default"
            size="lg"
            aria-label="Abrir cadastros"
          >
            <IconSettings size={18} />
          </ActionIcon>
        </Tooltip>
        <AccountMenu />
      </AppHeader>

      <AppShell.Main className={classes.main}>
        <TopNavigation />
      </AppShell.Main>
    </AppShell>
  );
}
