import { AppShell, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { AccountMenu } from './AccountMenu';
import { AppHeader } from './AppHeader';
import { SettingsTabs } from '../navigation/SettingsTabs';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import classes from './AppLayout.module.css';

export function SettingsLayout() {
  const { globalSearch } = useGlobalFilters();

  return (
    <AppShell header={{ height: 'var(--fb-header-height)' }}>
      <AppHeader>
        <Button
          component={Link}
          to={{ pathname: '/bills', search: globalSearch }}
          variant="default"
          size="xs"
          leftSection={<IconArrowLeft size={15} />}
        >
          Voltar ao painel
        </Button>
        <AccountMenu />
      </AppHeader>

      <AppShell.Main className={classes.main}>
        <SettingsTabs />
      </AppShell.Main>
    </AppShell>
  );
}
