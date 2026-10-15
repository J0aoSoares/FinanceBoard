import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconPencil, IconPlus } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
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
import { CONTACT_ROLE_LABELS, PROJECT_STATUS_LABELS } from '../../api/types';
import { formatPhone } from '../../lib/contact-format';
import { formatDocument } from '../../lib/document';
import { formatDate } from '../../lib/date';
import { ProjectFormModal } from './ProjectFormModal';
import { projectAddress } from './project-form';
import { ReceivablesTable } from '../receivables/ReceivablesTable';
import { useReceivableDialogs } from '../receivables/use-receivable-dialogs';
import { useProjectBillings } from '../../hooks/use-project-billings';
import { ProjectBillingsTable } from '../project-billings/ProjectBillingsTable';
import { useProjectBillingDialogs } from '../project-billings/use-project-billing-dialogs';
import { RetainageSection } from './RetainageSection';
import classes from './ProjectDetailPage.module.css';

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={classes.field}>
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{children || '—'}</span>
    </div>
  );
}

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

  const billings = useProjectBillings({ projectId: id });
  const billingDialogs = useProjectBillingDialogs({
    defaultCompanyId: global.companyId,
    defaultProjectId: id,
  });

  const [editing, setEditing] = useState(false);
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
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<IconPencil size={16} />}
              onClick={() => setEditing(true)}
            >
              Editar obra
            </Button>
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={billingDialogs.openNew}
            >
              Nova fatura
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
              Nova NF de serviço
            </Button>
          </Group>
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
                <Title order={3}>{project.name}</Title>
                <Badge
                  variant="light"
                  radius="xl"
                  color={project.status === 'ACTIVE' ? 'green' : 'gray'}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </Group>

              <div className={classes.cards} style={{ marginTop: 12 }}>
                <Info label="Cliente">
                  {project.client ? (
                    <Stack gap={0}>
                      <Anchor
                        component={Link}
                        to={`/clients/${project.client.id}`}
                        fw={500}
                      >
                        {project.client.name}
                      </Anchor>
                      {project.client.tradeName && (
                        <Text size="xs" c="dimmed">
                          {project.client.tradeName}
                        </Text>
                      )}
                    </Stack>
                  ) : (
                    project.clientName
                  )}
                </Info>
                <Info
                  label={
                    project.client?.personType === 'INDIVIDUAL' ? 'CPF' : 'CNPJ'
                  }
                >
                  {formatDocument(project.client?.document)}
                </Info>
                <Info label="Telefone / e-mail do cliente">
                  {[formatPhone(project.client?.phone), project.client?.email]
                    .filter(Boolean)
                    .join(' · ')}
                </Info>
                <Info label="Contato de referência na obra">
                  {project.referenceContact && (
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        {project.referenceContact.name} ·{' '}
                        {CONTACT_ROLE_LABELS[project.referenceContact.role]}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {[
                          formatPhone(project.referenceContact.phone),
                          project.referenceContact.email,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </Stack>
                  )}
                </Info>
              </div>

              <div className={classes.cards} style={{ marginTop: 12 }}>
                <Info label="Número do contrato">{project.contractNumber}</Info>
                <Info label="Início">
                  {project.startDate && formatDate(project.startDate)}
                </Info>
                <Info label="Previsão de término">
                  {project.expectedEndDate &&
                    formatDate(project.expectedEndDate)}
                </Info>
                <Info label="Endereço da obra">{projectAddress(project)}</Info>
              </div>

              {project.details && (
                <div style={{ marginTop: 12 }}>
                  <Info label="Detalhes">
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {project.details}
                    </Text>
                  </Info>
                </div>
              )}
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
                    hint={`${summary.data.receivedCount} de ${summary.data.invoiceCount} NFs recebidas`}
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
                    hint="Líquido das NFs pendentes"
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
              <Text fw={600}>NFs de serviço emitidas</Text>
              <QueryBoundary
                isLoading={receivables.isLoading}
                isError={receivables.isError}
                error={receivables.error}
                errorTitle="Não foi possível carregar as NFs da obra"
              >
                <ReceivablesTable
                  receivables={receivables.data ?? []}
                  showProject={false}
                  {...tableHandlers}
                />
              </QueryBoundary>
            </Stack>

            <Stack gap="xs">
              <Text fw={600}>Faturas emitidas</Text>
              <QueryBoundary
                isLoading={billings.isLoading}
                isError={billings.isError}
                error={billings.error}
                errorTitle="Não foi possível carregar as faturas da obra"
              >
                <ProjectBillingsTable
                  billings={billings.data ?? []}
                  showProject={false}
                  {...billingDialogs.tableHandlers}
                />
              </QueryBoundary>
            </Stack>

            <RetainageSection
              projectId={project.id}
              projectName={project.name}
            />
          </Stack>
        )}
      </QueryBoundary>

      {dialogs}
      {billingDialogs.dialogs}
      {editing && project && (
        <ProjectFormModal project={project} onClose={() => setEditing(false)} />
      )}
    </Stack>
  );
}
