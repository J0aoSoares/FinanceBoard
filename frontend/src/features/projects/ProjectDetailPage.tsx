import { Alert, Badge, Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MoneyText } from '../../components/display/MoneyText';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { useAuth } from '../../auth/use-auth';
import { useProjects } from '../../hooks/use-catalog';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import {
  useProjectBillingSummary,
  useReceivables,
} from '../../hooks/use-receivables';
import { PROJECT_STATUS_LABELS } from '../../api/types';
import { ReceivablesTable } from '../receivables/ReceivablesTable';
import { useReceivableDialogs } from '../receivables/use-receivable-dialogs';
import classes from './ProjectDetailPage.module.css';

function Card({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={classes.card}>
      <span className={classes.label}>{label}</span>
      {children}
      {hint && <span className={classes.hint}>{hint}</span>}
    </div>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const { canWrite } = useAuth();
  const { global } = useGlobalFilters();
  const projects = useProjects();
  const summary = useProjectBillingSummary(id);
  const receivables = useReceivables({ projectId: id });
  const { openNew, tableHandlers, dialogs } = useReceivableDialogs({
    defaultCompanyId: global.companyId,
    defaultProjectId: id,
  });

  const project = projects.data?.find((item) => item.id === id);

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="center">
        <Button
          component={Link}
          to="/projects"
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconArrowLeft size={15} />}
        >
          Voltar às obras
        </Button>
        {canWrite && project && (
          <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
            Nova nota de serviço
          </Button>
        )}
      </Group>

      <QueryBoundary
        isLoading={projects.isLoading}
        isError={projects.isError}
        error={projects.error}
        errorTitle="Não foi possível carregar a obra"
      >
        {!project ? (
          <Alert color="red" variant="light" title="Obra não encontrada">
            A obra solicitada não existe ou foi removida.
          </Alert>
        ) : (
          <Stack gap="lg">
            <div className={classes.header}>
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Title order={3}>{project.name}</Title>
                  <Text size="sm" c="dimmed">
                    Cliente: {project.clientName}
                  </Text>
                </Stack>
                <Badge
                  variant="light"
                  radius="xl"
                  color={project.status === 'ACTIVE' ? 'green' : 'gray'}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </Group>
            </div>

            <QueryBoundary
              isLoading={summary.isLoading}
              isError={summary.isError}
              error={summary.error}
              errorTitle="Não foi possível carregar os totais da obra"
            >
              {summary.data && (
                <div className={classes.cards}>
                  <Card
                    label="Total faturado"
                    hint={
                      <>
                        Líquido <MoneyText value={summary.data.netInvoiced} /> ·
                        retenções{' '}
                        <MoneyText value={summary.data.withholdingTotal} />
                      </>
                    }
                  >
                    <MoneyText
                      value={summary.data.grossInvoiced}
                      strong
                      withSymbol
                    />
                  </Card>
                  <Card
                    label="Total recebido"
                    hint={`${summary.data.receivedCount} de ${summary.data.invoiceCount} notas recebidas`}
                  >
                    <MoneyText
                      value={summary.data.received}
                      tone="inflow"
                      strong
                      withSymbol
                    />
                  </Card>
                  <Card
                    label="Saldo a receber"
                    hint="Líquido das notas pendentes"
                  >
                    <MoneyText
                      value={summary.data.outstanding}
                      strong
                      withSymbol
                    />
                  </Card>
                </div>
              )}
            </QueryBoundary>

            <Stack gap="xs">
              <Text fw={600}>Notas de serviço emitidas</Text>
              <QueryBoundary
                isLoading={receivables.isLoading}
                isError={receivables.isError}
                error={receivables.error}
                errorTitle="Não foi possível carregar as notas da obra"
              >
                <ReceivablesTable
                  receivables={receivables.data ?? []}
                  showProject={false}
                  {...tableHandlers}
                />
              </QueryBoundary>
            </Stack>
          </Stack>
        )}
      </QueryBoundary>

      {dialogs}
    </Stack>
  );
}
