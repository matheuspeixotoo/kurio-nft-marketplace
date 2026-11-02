import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Favorites } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuth } from '@/features/auth/auth-context'
import { toast } from '@/components/ui/toast'
import { useAnnounce } from '@/components/live-announcer'

export function useFavorites() {
  const { userId, isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.favorites(userId),
    queryFn: ({ signal }) => api.favorites.list({ signal }),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

/**
 * Optimistic favorite toggle: the heart flips immediately, the previous list is restored if the
 * mutation fails (scenario `favorites-fail`), and the server state is refetched on settle.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const announce = useAnnounce()
  const key = queryKeys.favorites(userId)
  return useMutation({
    mutationFn: ({ nftId, next }: { nftId: string; next: boolean; name?: string }) => (next ? api.favorites.add(nftId) : api.favorites.remove(nftId)),
    onMutate: async ({ nftId, next }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (data) => {
        const ids = new Set(data?.ids ?? [])
        if (next) ids.add(nftId)
        else ids.delete(nftId)
        return { ids: Array.from(ids) }
      })
      return { previous }
    },
    onError: (error, vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
      toast({ title: 'Não foi possível atualizar os favoritos', description: getErrorMessage(error), variant: 'error' })
      announce(`Falha ao ${vars.next ? 'favoritar' : 'remover dos favoritos'}. Estado anterior restaurado.`, 'assertive')
    },
    onSuccess: (data, vars) => {
      queryClient.setQueryData(key, data)
      announce(`${vars.name ?? 'NFT'} ${vars.next ? 'adicionado aos' : 'removido dos'} favoritos.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
