import { useLocation } from 'react-router-dom';
import { ContentTabs } from './ContentTabs';
import { PeriodSelector } from './PeriodSelector';
import classes from './TopNavigation.module.css';

export function TopNavigation() {
  const location = useLocation();
  const usesMonthPeriod = !location.pathname.startsWith('/reports');

  return (
    <div className={classes.root}>
      {usesMonthPeriod && (
        <div className={classes.period}>
          <PeriodSelector />
        </div>
      )}
      <ContentTabs />
    </div>
  );
}
