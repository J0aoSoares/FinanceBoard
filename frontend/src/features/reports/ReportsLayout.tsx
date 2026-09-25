import { Button, Stack } from '@mantine/core';
import {
  IconBuildingCommunity,
  IconChartBar,
  IconReceiptTax,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ReportFilterBar } from './ReportFilterBar';
import classes from './ReportsLayout.module.css';

const reports = [
  { path: '/reports/cashflow', label: 'Fluxo de caixa', icon: IconChartBar },
  { path: '/reports/withholdings', label: 'Retenções', icon: IconReceiptTax },
  {
    path: '/reports/project-costs',
    label: 'Custo por obra',
    icon: IconBuildingCommunity,
  },
];

export function ReportsLayout() {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === reports[0].path && location.pathname === '/reports');

  return (
    <Stack gap="md" p="lg">
      <div className={classes.subnav}>
        {reports.map(({ path, label, icon: Icon }) => (
          <Button
            key={path}
            component={Link}
            to={{ pathname: path, search: location.search }}
            size="xs"
            variant={isActive(path) ? 'white' : 'subtle'}
            color={isActive(path) ? 'blue' : 'gray'}
            leftSection={<Icon size={15} />}
          >
            {label}
          </Button>
        ))}
      </div>

      <ReportFilterBar />

      <Outlet />
    </Stack>
  );
}
