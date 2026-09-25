import { Alert, Button, Group } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { MonthField } from '../../components/fields/MonthField';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import { useReportFilters } from '../../hooks/use-report-filters';
import { PERIOD_PRESETS } from '../../lib/period';

export function ReportFilterBar() {
  const {
    from,
    to,
    projectId,
    periodError,
    setPeriod,
    setFrom,
    setTo,
    setProjectId,
  } = useReportFilters();

  const isPresetActive = (presetFrom: string, presetTo: string) =>
    presetFrom === from && presetTo === to;

  return (
    <>
      <Group gap="sm" align="flex-end" wrap="wrap">
        <MonthField
          label="De"
          size="xs"
          w={190}
          clearable={false}
          value={from}
          onChange={setFrom}
          error={periodError ? ' ' : null}
        />
        <MonthField
          label="Até"
          size="xs"
          w={190}
          clearable={false}
          value={to}
          onChange={setTo}
          error={periodError ? ' ' : null}
        />
        <ProjectSelect
          size="xs"
          w={220}
          placeholder="Todas as obras"
          value={projectId ?? null}
          onChange={setProjectId}
        />
        <Group gap={4}>
          {PERIOD_PRESETS.map((preset) => {
            const range = preset.build();
            return (
              <Button
                key={preset.id}
                size="xs"
                variant={
                  isPresetActive(range.from, range.to) ? 'light' : 'subtle'
                }
                color="gray"
                onClick={() => setPeriod(range.from, range.to)}
              >
                {preset.label}
              </Button>
            );
          })}
        </Group>
      </Group>

      {periodError && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Período inválido"
        >
          {periodError}
        </Alert>
      )}
    </>
  );
}
