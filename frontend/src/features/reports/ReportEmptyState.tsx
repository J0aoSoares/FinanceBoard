import { Alert } from '@mantine/core';
import { IconMoodEmpty } from '@tabler/icons-react';
import { formatMonth } from '../../lib/date';
import type { Regime } from '../../api/types';

interface ReportEmptyStateProps {
  from: string;
  to: string;
  regime: Regime;
  subject: string;
}

export function ReportEmptyState({
  from,
  to,
  regime,
  subject,
}: ReportEmptyStateProps) {
  const period =
    from === to
      ? formatMonth(from)
      : `${formatMonth(from)} a ${formatMonth(to)}`;

  return (
    <Alert
      color="gray"
      variant="light"
      icon={<IconMoodEmpty size={18} />}
      title={`Nenhum ${subject} no período`}
    >
      Não há dados entre {period}. Amplie o intervalo
      {regime === 'cash'
        ? ' ou volte ao regime de competência, que inclui títulos ainda em aberto.'
        : ' ou revise os filtros de empresa e obra.'}
    </Alert>
  );
}
