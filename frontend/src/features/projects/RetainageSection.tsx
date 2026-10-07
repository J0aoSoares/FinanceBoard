import { ActionIcon, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowBackUp, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { MoneyText } from '../../components/display/MoneyText';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import tableClasses from '../../components/display/DataTable.module.css';
import { useAuth } from '../../auth/use-auth';
import {
  useDeleteRetainageRelease,
  useProjectRetainage,
} from '../../hooks/use-project-billings';
import { formatCurrency, compareMoney } from '../../lib/money';
import { formatDate } from '../../lib/date';
import type { RetainageRelease } from '../../api/types';
import { RetainageReleaseModal } from './RetainageReleaseModal';
import classes from './ProjectDetailPage.module.css';

interface RetainageSectionProps {
  projectId: string;
  projectName: string;
}

export function RetainageSection({
  projectId,
  projectName,
}: RetainageSectionProps) {
  const { canWrite } = useAuth();
  const retainage = useProjectRetainage(projectId);
  const deleteRelease = useDeleteRetainageRelease();
  const [releasing, setReleasing] = useState(false);

  const confirmReverse = (release: RetainageRelease) =>
    modals.openConfirmModal({
      title: 'Estornar devolução de caução',
      centered: true,
      children: (
        <Text size="sm">
          A devolução de <strong>{formatCurrency(release.amount)}</strong> em{' '}
          {formatDate(release.returnDate)} será desfeita e o valor voltará para
          o saldo de caução a receber.
        </Text>
      ),
      labels: { confirm: 'Estornar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteRelease.mutate(release.id),
    });

  const data = retainage.data;
  const hasBalance =
    data !== undefined && compareMoney(data.balance, '0.00') > 0;

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text fw={600}>Caução</Text>
        {canWrite && (
          <Tooltip
            label="Não há caução retida a receber nesta obra"
            disabled={hasBalance}
            withArrow
          >
            <div>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                disabled={!hasBalance}
                onClick={() => setReleasing(true)}
              >
                Registrar devolução de caução
              </Button>
            </div>
          </Tooltip>
        )}
      </Group>

      <QueryBoundary
        isLoading={retainage.isLoading}
        isError={retainage.isError}
        error={retainage.error}
        errorTitle="Não foi possível carregar a caução da obra"
      >
        {data && (
          <Stack gap="sm">
            <div className={classes.cards}>
              <div className={classes.card}>
                <span className={classes.label}>Caução retida</span>
                <MoneyText value={data.withheld} strong withSymbol />
                <span className={classes.hint}>
                  Soma das cauções das faturas
                </span>
              </div>
              <div className={classes.card}>
                <span className={classes.label}>Caução devolvida</span>
                <MoneyText
                  value={data.released}
                  strong
                  withSymbol
                  tone="inflow"
                />
                <span className={classes.hint}>
                  {data.releases.length}{' '}
                  {data.releases.length === 1 ? 'devolução' : 'devoluções'}
                </span>
              </div>
              <div className={classes.card}>
                <span className={classes.label}>Saldo a receber</span>
                <MoneyText value={data.balance} strong withSymbol />
                <span className={classes.hint}>Retida menos devolvida</span>
              </div>
            </div>

            {data.releases.length > 0 && (
              <div className={tableClasses.wrapper}>
                <table className={tableClasses.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Empresa</th>
                      <th>Banco</th>
                      <th className={tableClasses.numeric}>Valor</th>
                      {canWrite && <th className={tableClasses.actions} />}
                    </tr>
                  </thead>
                  <tbody>
                    {data.releases.map((release) => (
                      <tr key={release.id}>
                        <td>{formatDate(release.returnDate)}</td>
                        <td>{release.company.legalName}</td>
                        <td>{release.bank.name}</td>
                        <td className={tableClasses.numeric}>
                          <MoneyText value={release.amount} tone="inflow" />
                        </td>
                        {canWrite && (
                          <td className={tableClasses.actions}>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label="Estornar devolução"
                              onClick={() => confirmReverse(release)}
                            >
                              <IconArrowBackUp size={16} />
                            </ActionIcon>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Stack>
        )}
      </QueryBoundary>

      {releasing && data && (
        <RetainageReleaseModal
          projectName={projectName}
          retainage={data}
          onClose={() => setReleasing(false)}
        />
      )}
    </Stack>
  );
}
