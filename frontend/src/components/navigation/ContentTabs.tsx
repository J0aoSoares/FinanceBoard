import { Tabs } from '@mantine/core';
import {
  IconChartBar,
  IconCoins,
  IconFileInvoice,
  IconReceipt2,
} from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import classes from './ContentTabs.module.css';

const tabs = [
  { value: '/bills', label: 'Contas a pagar', icon: IconReceipt2 },
  { value: '/invoices', label: 'Faturas', icon: IconFileInvoice },
  { value: '/receivables', label: 'Notas de serviço', icon: IconCoins },
  { value: '/reports', label: 'Relatórios', icon: IconChartBar },
];

export function ContentTabs() {
  const location = useLocation();
  const { globalSearch } = useGlobalFilters();
  const listRef = useRef<HTMLDivElement>(null);

  const active =
    tabs.find((tab) => location.pathname.startsWith(tab.value))?.value ??
    tabs[0].value;

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [active]);

  return (
    <Tabs
      variant="outline"
      value={active}
      className={classes.tabs}
      classNames={{ list: classes.list, tab: classes.tab }}
    >
      <Tabs.List ref={listRef}>
        {tabs.map(({ value, label, icon: Icon }) => (
          <Tabs.Tab
            key={value}
            value={value}
            leftSection={<Icon size={16} />}
            renderRoot={(props) => (
              <Link {...props} to={{ pathname: value, search: globalSearch }} />
            )}
          >
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      <div className={classes.panel}>
        <Outlet />
      </div>
    </Tabs>
  );
}
