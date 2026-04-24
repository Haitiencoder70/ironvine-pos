import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { imagesApi } from '../services/api';
import type { Image } from '../types';

export function useEntityImages(entityType: string, entityId: string | undefined) {
  const qc = useQueryClient();
  const key = ['images', entityType, entityId];

  const query = useQuery({
    queryKey: key,
    queryFn: () => imagesApi.getForEntity(entityType, entityId!),
    select: (r) => r.data,
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => imagesApi.delete(imageId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) => imagesApi.setPrimary(imageId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) => imagesApi.reorder(imageIds),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  function onUploaded(_newImages: Image[]) {
    void qc.invalidateQueries({ queryKey: key });
  }

  return {
    images: query.data ?? [],
    isLoading: query.isLoading,
    onUploaded,
    onDelete: (id: string) => deleteMutation.mutate(id),
    onSetPrimary: (id: string) => setPrimaryMutation.mutate(id),
    onReorder: (ids: string[]) => reorderMutation.mutate(ids),
  };
}
