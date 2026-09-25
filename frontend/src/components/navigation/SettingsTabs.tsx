import { Tabs } from '@mantine/core';
import {
  IconBuildingCommunity,
  IconBuildingSkyscraper,
  IconTags,
  IconTruck,
  IconUsers,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/use-auth';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import contentClasses from './ContentTabs.module.css';
import classes from './SettingsTabs.module.css';

const baseTabs = [
  { value: '/companies', label: 'Empresas', icon: IconBuildingSkyscraper },
  { value: '/projects', label: 'Obras', icon: IconBuildingCommunity },
  { value: '/suppliers', label: 'Fornecedores', icon: IconTruck },
  { value: '/categories', label: 'Categorias', icon: IconTags },
];

const usersTab = { value: '/users', label: 'Usuários', icon: IconUsers };

export function SettingsTabs() {
  const location = useLocation();
  const { globalSearch } = useGlobalFilters();
  const { isAdmin } = useAuth();

  const tabs = isAdmin ? [...baseTabs, usersTab] : baseTabs;

  const active =
    tabs.find((tab) => location.pathname.startsWith(tab.value))?.value ??
    tabs[0].value;

  return (
    <div className={classes.root}>
      <h1 className={classes.heading}>Cadastros</h1>

      <Tabs
        variant="outline"
        value={active}
        className={contentClasses.tabs}
        classNames={{ list: contentClasses.list, tab: contentClasses.tab }}
      >
        <Tabs.List>
          {tabs.map(({ value, label, icon: Icon }) => (
            <Tabs.Tab
              key={value}
              value={value}
              leftSection={<Icon size={16} />}
              renderRoot={(props) => (
                <Link
                  {...props}
                  to={{ pathname: value, search: globalSearch }}
                />
              )}
            >
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <div className={contentClasses.panel}>
          <Outlet />
        </div>
      </Tabs>
    </div>
  );
}
