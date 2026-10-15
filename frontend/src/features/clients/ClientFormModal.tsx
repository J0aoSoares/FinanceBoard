import { Button, Group, Modal, ScrollArea, Stack } from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { useCreateClient, useUpdateClient } from '../../hooks/use-clients';
import type { Client } from '../../api/types';
import { ClientDetailsFields } from './ClientDetailsFields';
import {
  clientInput,
  clientToFormValues,
  emptyClientForm,
  validateClient,
  type FormErrors,
} from './client-form';

interface ClientFormModalProps {
  client: Client | null;
  onClose: () => void;
}

export function ClientFormModal({ client, onClose }: ClientFormModalProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = client !== null;
  const [values, setValues] = useState(() =>
    client ? clientToFormValues(client) : emptyClientForm(),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const pending = createClient.isPending || updateClient.isPending;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateClient(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    const onSuccess = () => onClose();
    if (isEditing) {
      updateClient.mutate(
        { id: client.id, input: clientInput(values, 'update') },
        { onSuccess },
      );
    } else {
      createClient.mutate(clientInput(values, 'create'), { onSuccess });
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEditing ? `Editar ${client.name}` : 'Novo cliente'}
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <ClientDetailsFields
            value={values}
            onChange={setValues}
            errors={errors}
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
