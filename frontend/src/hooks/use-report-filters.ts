import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReportPeriodFilters } from '../api/types';
import { currentMonth, isMonth, shiftMonth, type Month } from '../lib/date';
import { validateReportPeriod } from '../lib/period';
import { useGlobalFilters } from './use-global-filters';

const DEFAULT_SPAN = 11;

export function useReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { global, screen, setFilter } = useGlobalFilters();

  const from = useMemo<Month>(() => {
    const value = searchParams.get('from');
    return value && isMonth(value)
      ? value
      : shiftMonth(currentMonth(), -DEFAULT_SPAN);
  }, [searchParams]);

  const to = useMemo<Month>(() => {
    const value = searchParams.get('to');
    return value && isMonth(value) ? value : currentMonth();
  }, [searchParams]);

  const setPeriod = useCallback(
    (nextFrom: Month, nextTo: Month) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('from', nextFrom);
          next.set('to', nextTo);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFrom = useCallback(
    (value: Month | null) => value && setPeriod(value, to),
    [setPeriod, to],
  );

  const setTo = useCallback(
    (value: Month | null) => value && setPeriod(from, value),
    [setPeriod, from],
  );

  const periodError = validateReportPeriod(from, to);

  const filters = useMemo<ReportPeriodFilters | null>(() => {
    if (periodError) {
      return null;
    }
    return {
      from,
      to,
      regime: global.regime,
      companyId: global.companyId,
      projectId: screen.projectId,
    };
  }, [
    periodError,
    from,
    to,
    global.regime,
    global.companyId,
    screen.projectId,
  ]);

  return {
    from,
    to,
    projectId: screen.projectId,
    periodError,
    filters,
    setPeriod,
    setFrom,
    setTo,
    setProjectId: (value: string | null) => setFilter('projectId', value),
  };
}
