import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { nameKey } from '../lib/name-key';
import { notifyApiError, notifySuccess } from '../lib/notify';

export interface NamedEntity {
  id: string;
  name: string;
}

interface CreateByNameConfig<T extends NamedEntity> {
  queryKey: string;
  list: () => Promise<T[]>;
  create: (name: string) => Promise<T>;
  successMessage: string;
  errorTitle: string;
}

export function findByNameKey<T extends NamedEntity>(items: T[], name: string) {
  const key = nameKey(name);
  return key === ''
    ? null
    : (items.find((item) => nameKey(item.name) === key) ?? null);
}

export function useCreateByName<T extends NamedEntity>({
  queryKey,
  list,
  create,
  successMessage,
  errorTitle,
}: CreateByNameConfig<T>) {
  const queryClient = useQueryClient();

  const findExisting = async (name: string) => {
    const items = await queryClient.fetchQuery({
      queryKey: [queryKey],
      queryFn: list,
      staleTime: 0,
    });
    return findByNameKey(items, name);
  };

  return useMutation({
    mutationFn: async (name: string) => {
      try {
        return { item: await create(name), created: true };
      } catch (error) {
        const existing =
          error instanceof ApiError && error.status === 409
            ? await findExisting(name)
            : null;
        if (!existing) {
          throw error;
        }
        return { item: existing, created: false };
      }
    },
    onSuccess: ({ item, created }) => {
      queryClient.setQueryData<T[]>([queryKey], (current) =>
        current && !current.some((entry) => entry.id === item.id)
          ? [...current, item]
          : current,
      );
      if (created) {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        notifySuccess(successMessage);
      }
    },
    onError: (error) => notifyApiError(error, errorTitle),
  });
}
