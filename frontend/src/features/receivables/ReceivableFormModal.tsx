import {
  Alert,
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { CompanySelect } from '../../components/fields/CompanySelect';
import { DateField } from '../../components/fields/DateField';
import { MoneyInput } from '../../components/fields/MoneyInput';
import { MonthField } from '../../components/fields/MonthField';
import { ProjectSelect } from '../../components/fields/ProjectSelect';
import { MoneyText } from '../../components/display/MoneyText';
import { useProjects } from '../../hooks/use-catalog';
import {
  useCreateReceivable,
  useUpdateReceivable,
} from '../../hooks/use-receivables';
import type { Receivable } from '../../api/types';
import {
  buildCreatePayload,
  buildUpdatePayload,
  emptyReceivableForm,
  previewNetAmount,
  receivableFormValidation,
  receivableToFormValues,
  type ReceivableFormValues,
} from './receivable-form';
import { WithholdingsField } from './WithholdingsField';
import { InlineProjectCreator } from '../projects/InlineProjectCreator';
import { projectClientName } from '../clients/client-form';

interface ReceivableFormModalProps {
  receivable: Receivable | null;
  defaultCompanyId?: string;
  defaultProjectId?: string;
  onClose: () => void;
}

export function ReceivableFormModal({
  receivable,
  defaultCompanyId,
  defaultProjectId,
  onClose,
}: ReceivableFormModalProps) {
  const createReceivable = useCreateReceivable();
  const updateReceivable = useUpdateReceivable();
  const { data: projects } = useProjects();

  const [newProjectName, setNewProjectName] = useState<string | null>(null);
  const clientOf = (projectId: string | null) => {
    const project = projects?.find((item) => item.id === projectId);
    return project ? projectClientName(project) : '';
  };

  const form = useForm<ReceivableFormValues>({
    mode: 'controlled',
    initialValues: receivable
      ? receivableToFormValues(receivable)
      : {
          ...emptyReceivableForm(defaultCompanyId),
          projectId: defaultProjectId ?? null,
          clientName: defaultProjectId ? clientOf(defaultProjectId) : '',
        },
    validate: receivableFormValidation,
    validateInputOnBlur: true,
  });

  const isEditing = receivable !== null;
  const pending = createReceivable.isPending || updateReceivable.isPending;
  const preview = previewNetAmount(form.getValues());
  const missingLegacyData = isEditing && receivable.number === null;

  const projectProps = form.getInputProps('projectId');
  const changeProject = (next: string | null, nextClient = clientOf(next)) => {
    const current = form.getValues();
    const previousClient = clientOf(current.projectId);
    projectProps.onChange(next);
    if (
      next !== null &&
      (current.clientName.trim() === '' ||
        current.clientName === previousClient)
    ) {
      form.setFieldValue('clientName', nextClient);
    }
  };

  const handleSubmit = (submitted: ReceivableFormValues) => {
    const onSuccess = () => onClose();

    if (isEditing) {
      updateReceivable.mutate(
        { id: receivable.id, input: buildUpdatePayload(submitted) },
        { onSuccess },
      );
    } else {
      createReceivable.mutate(buildCreatePayload(submitted), { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? 'Editar NF de serviço' : 'Nova NF de serviço'}
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {missingLegacyData && (
            <Alert
              color="yellow"
              variant="light"
              icon={<IconInfoCircle size={18} />}
            >
              Este lançamento é anterior às NFs de serviço. Informe o número da
              NF para salvar.
            </Alert>
          )}

          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <TextInput
                label="Número da NF"
                placeholder="NFS-0101"
                withAsterisk
                {...form.getInputProps('number')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <CompanySelect
                label="Empresa emissora"
                placeholder="Selecione a empresa"
                withAsterisk
                clearable={false}
                {...form.getInputProps('companyId')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Tomador"
                description="Quem paga a NF"
                withAsterisk
                {...form.getInputProps('clientName')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              {newProjectName === null && (
                <ProjectSelect
                  clearable
                  activeOnly
                  placeholder="Digite ou selecione a obra"
                  description="Opcional. Ao escolher, preenche o tomador"
                  onCreateRequest={setNewProjectName}
                  {...projectProps}
                  onChange={(next) => changeProject(next)}
                />
              )}
            </Grid.Col>
            {newProjectName !== null && (
              <Grid.Col span={12}>
                <InlineProjectCreator
                  initialName={newProjectName}
                  onCancel={() => setNewProjectName(null)}
                  onCreated={(project) => {
                    changeProject(project.id, projectClientName(project));
                    setNewProjectName(null);
                  }}
                />
              </Grid.Col>
            )}

            <Grid.Col span={12}>
              <TextInput
                label="Descrição do serviço"
                placeholder="Ex.: Medição 04 - terraplenagem"
                withAsterisk
                {...form.getInputProps('description')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MonthField
                label="Competência"
                withAsterisk
                {...form.getInputProps('competence')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DateField
                label="Emissão"
                withAsterisk
                {...form.getInputProps('issueDate')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DateField
                label="Vencimento"
                withAsterisk
                {...form.getInputProps('dueDate')}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MoneyInput
                label="Valor bruto"
                withAsterisk
                {...form.getInputProps('grossAmount')}
              />
            </Grid.Col>
          </Grid>

          <Divider />

          <WithholdingsField form={form} />

          <Group
            justify="space-between"
            align="center"
            bg="var(--fb-surface-sunken)"
            p="xs"
            style={{ borderRadius: 'var(--fb-radius-sm)' }}
          >
            <Text size="xs" c="dimmed">
              Líquido a receber — o valor definitivo é calculado pelo backend
            </Text>
            <MoneyText value={preview} strong withSymbol tone="inflow" />
          </Group>

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
