import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowLeft,
  IconCash,
  IconListCheck,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MoneyText } from '../../components/display/MoneyText';
import { QueryBoundary } from '../../components/display/QueryBoundary';
import { StatusBadge } from '../../components/display/StatusBadge';
import {
  useDeleteInvoice,
  useInvoice,
  useReverseInvoicePayment,
} from '../../hooks/use-invoices';
import { useGlobalFilters } from '../../hooks/use-global-filters';
import { useAuth } from '../../auth/use-auth';
import { formatDate } from '../../lib/date';
import type { Invoice } from '../../api/types';
import { InvoiceBillsTable } from './InvoiceBillsTable';
import { InvoiceCompositionModal } from './InvoiceCompositionModal';
import { InvoiceFormModal } from './InvoiceFormModal';
import { InvoicePaymentModal } from './InvoicePaymentModal';
import classes from './InvoiceDetailPage.module.css';

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className={classes.field}>
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{children}</span>
    </div>
  );
}

function Total({ label, children }: FieldProps) {
  return (
    <div className={classes.field}>
      <span className={classes.label}>{label}</span>
      {children}
    </div>
  );
}

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const { global, globalSearch } = useGlobalFilters();
  const { canWrite } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [paying, setPaying] = useState(false);

  const { data, isLoading, isError, error } = useInvoice(id);
  const reversePayment = useReverseInvoicePayment();
  const deleteInvoice = useDeleteInvoice();

  const backTo = { pathname: '/invoices', search: globalSearch };

  const confirmReverse = (invoice: Invoice) =>
    modals.openConfirmModal({
      title: 'Estornar pagamento',
      centered: true,
      children: (
        <Text size="sm">
          O pagamento da fatura <strong>{invoice.number}</strong> será desfeito.
          {invoice.billCount === 1
            ? ' A conta que a compõe volta para pendente.'
            : ` As ${invoice.billCount} contas que a compõem voltam para pendente.`}
        </Text>
      ),
      labels: { confirm: 'Estornar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => reversePayment.mutate(invoice.id),
    });

  const confirmDelete = (invoice: Invoice) =>
    modals.openConfirmModal({
      title: 'Excluir fatura',
      centered: true,
      children: (
        <Text size="sm">
          A fatura <strong>{invoice.number}</strong> será removida.
          {invoice.billCount === 1
            ? ' A conta que a compõe não é excluída: ela é desvinculada e volta a ficar disponível para faturamento.'
            : ` As ${invoice.billCount} contas que a compõem não são excluídas: elas são desvinculadas e voltam a ficar disponíveis para faturamento.`}
        </Text>
      ),
      labels: { confirm: 'Excluir fatura', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deleteInvoice.mutate(invoice.id, {
          onSuccess: () => navigate(backTo),
        }),
    });

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between" align="center">
        <Button
          component={Link}
          to={backTo}
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconArrowLeft size={15} />}
        >
          Voltar às faturas
        </Button>
      </Group>

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        errorTitle="Não foi possível carregar a fatura"
      >
        {data && (
          <Stack gap="lg">
            <div className={classes.header}>
              <Group gap="xl" wrap="wrap">
                <Field label="Número">{data.number}</Field>
                <Field label="Empresa">{data.company.legalName}</Field>
                <Field label="Fornecedor">
                  {data.supplier ? data.supplier.name : 'Não informado'}
                </Field>
                <Field label="Vencimento">{formatDate(data.dueDate)}</Field>
                <Field label="Pagamento">{formatDate(data.paymentDate)}</Field>
                <Field label="Situação">
                  <StatusBadge status={data.effectiveStatus} />
                </Field>
              </Group>

              <div className={classes.totals}>
                <Total label="Total bruto">
                  <MoneyText value={data.grossTotal} strong withSymbol />
                </Total>
                <Total label="Retenções">
                  <MoneyText
                    value={data.withholdingTotal}
                    tone="muted"
                    strong
                  />
                </Total>
                <Total label="Total líquido">
                  <MoneyText
                    value={data.netTotal}
                    tone="outflow"
                    strong
                    withSymbol
                  />
                </Total>
              </div>
            </div>

            {canWrite && data.effectiveStatus === 'PAID' && (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconAlertTriangle size={18} />}
                title="Fatura paga"
              >
                Dados, composição e exclusão ficam bloqueados enquanto o
                pagamento estiver registrado. Estorne o pagamento para liberar a
                edição.
              </Alert>
            )}

            {canWrite && (
              <Group gap="xs" wrap="wrap">
                {data.effectiveStatus === 'PAID' ? (
                  <Button
                    variant="default"
                    leftSection={<IconArrowBackUp size={16} />}
                    loading={reversePayment.isPending}
                    onClick={() => confirmReverse(data)}
                  >
                    Estornar pagamento
                  </Button>
                ) : (
                  <Button
                    leftSection={<IconCash size={16} />}
                    onClick={() => setPaying(true)}
                  >
                    Registrar pagamento
                  </Button>
                )}

                <Button
                  variant="default"
                  leftSection={<IconPencil size={16} />}
                  disabled={data.effectiveStatus === 'PAID'}
                  onClick={() => setEditing(true)}
                >
                  Editar dados
                </Button>
                <Button
                  variant="default"
                  leftSection={<IconListCheck size={16} />}
                  disabled={data.effectiveStatus === 'PAID'}
                  onClick={() => setComposing(true)}
                >
                  Gerenciar composição
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  disabled={data.effectiveStatus === 'PAID'}
                  onClick={() => confirmDelete(data)}
                >
                  Excluir fatura
                </Button>
              </Group>
            )}

            <InvoiceBillsTable invoice={data} regime={global.regime} />

            {editing && (
              <InvoiceFormModal
                key={`edit-${data.id}`}
                invoice={data}
                onClose={() => setEditing(false)}
              />
            )}

            {composing && (
              <InvoiceCompositionModal
                key={`composition-${data.id}-${data.billCount}`}
                invoice={data}
                onClose={() => setComposing(false)}
              />
            )}

            {paying && (
              <InvoicePaymentModal
                key={`payment-${data.id}`}
                invoice={data}
                onClose={() => setPaying(false)}
              />
            )}
          </Stack>
        )}
      </QueryBoundary>
    </Stack>
  );
}
