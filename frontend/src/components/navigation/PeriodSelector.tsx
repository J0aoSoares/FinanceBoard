import { Box, Button, Menu, SegmentedControl } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { MonthField } from '../fields/MonthField';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { buildMonth, currentYear, shortMonthLabels } from '../../lib/date';
import classes from './PeriodSelector.module.css';

const YEARS_BACK = 4;
const YEARS_AHEAD = 1;

const yearOptions = () => {
  const base = currentYear();
  return Array.from(
    { length: YEARS_BACK + YEARS_AHEAD + 1 },
    (_, index) => base + YEARS_AHEAD - index,
  );
};

export function PeriodSelector() {
  const { global, year, setYear, setFilter } = useGlobalFilters();

  const months = shortMonthLabels().map((label, index) => ({
    value: buildMonth(year, index + 1),
    label,
  }));

  return (
    <div className={classes.root}>
      <Menu position="bottom-start" shadow="md" width={110}>
        <Menu.Target>
          <Button
            variant="default"
            size="xs"
            className={classes.yearButton}
            rightSection={<IconChevronDown size={14} />}
            aria-label={`Ano ${year}. Alterar ano`}
          >
            {year}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {yearOptions().map((option) => (
            <Menu.Item
              key={option}
              onClick={() => setYear(option)}
              fw={option === year ? 700 : 400}
            >
              {option}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      <Box visibleFrom="sm" className={classes.months}>
        <SegmentedControl
          fullWidth
          size="xs"
          withItemsBorders={false}
          data={months}
          value={global.month}
          onChange={(value) => setFilter('month', value)}
          classNames={{
            root: classes.segmentedRoot,
            indicator: classes.segmentedIndicator,
            label: classes.segmentedLabel,
          }}
        />
      </Box>

      <Box hiddenFrom="sm" className={classes.months}>
        <MonthField
          size="xs"
          clearable={false}
          aria-label="Competência"
          value={global.month}
          onChange={(value) => setFilter('month', value)}
        />
      </Box>
    </div>
  );
}
