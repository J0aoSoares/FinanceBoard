import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EffectiveStatus, Regime } from '../api/types';
import { currentMonth, isMonth, withYear, yearOf } from '../lib/date';

const REGIMES: Regime[] = ['accrual', 'cash'];
const STATUSES: EffectiveStatus[] = ['PENDING', 'PAID', 'OVERDUE'];

export interface GlobalFilters {
  companyId?: string;
  regime: Regime;
  month: string;
}

export interface ScreenFilters {
  projectId?: string;
  categoryId?: string;
  supplierId?: string;
  status?: EffectiveStatus;
}

export type FilterKey = keyof GlobalFilters | keyof ScreenFilters;

export function useGlobalFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const read = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  const global = useMemo<GlobalFilters>(() => {
    const regime = read('regime');
    const month = read('month');
    return {
      companyId: read('companyId'),
      regime: REGIMES.includes(regime as Regime)
        ? (regime as Regime)
        : 'accrual',
      month: month && isMonth(month) ? month : currentMonth(),
    };
  }, [read]);

  const screen = useMemo<ScreenFilters>(() => {
    const status = read('status');
    return {
      projectId: read('projectId'),
      categoryId: read('categoryId'),
      supplierId: read('supplierId'),
      status: STATUSES.includes(status as EffectiveStatus)
        ? (status as EffectiveStatus)
        : undefined,
    };
  }, [read]);

  const setFilter = useCallback(
    (key: FilterKey, value: string | null | undefined) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value === null || value === undefined || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearScreenFilters = useCallback(() => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const key of ['projectId', 'categoryId', 'supplierId', 'status']) {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const setYear = useCallback(
    (year: number) => setFilter('month', withYear(global.month, year)),
    [setFilter, global.month],
  );

  const globalSearch = useMemo(() => {
    const next = new URLSearchParams();
    next.set('month', global.month);
    next.set('regime', global.regime);
    if (global.companyId) {
      next.set('companyId', global.companyId);
    }
    return `?${next.toString()}`;
  }, [global]);

  const hasScreenFilters = Object.values(screen).some(Boolean);

  return {
    global,
    screen,
    year: yearOf(global.month),
    setYear,
    globalSearch,
    setFilter,
    clearScreenFilters,
    hasScreenFilters,
  };
}
