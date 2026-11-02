import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PasswordChangeInput, ProfileUpdateInput, WalletInput, WalletSlot } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/features/auth/auth-context'
import { toast } from '@/components/ui/toast'
import { useAnnounce } from '@/components/live-announcer'
import { getErrorMessage } from '@/lib/api/errors'

export function useProfile() {
  const { userId, isAuthenticated } = useAuth()
  return useQuery({ queryKey: queryKeys.profile(userId), queryFn: ({ signal }) => api.profile.get({ signal }), enabled: isAuthenticated })
}

export function useWallets() {
  const { userId, isAuthenticated } = useAuth()
  return useQuery({ queryKey: queryKeys.wallets(userId), queryFn: ({ signal }) => api.wallets.list({ signal }), enabled: isAuthenticated })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const announce = useAnnounce()
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => api.profile.update(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(userId), profile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
      toast({ title: 'Perfil salvo', variant: 'success' })
      announce('Dados do perfil salvos.')
    },
  })
}

export function useAvatar() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const announce = useAnnounce()
  const set = useMutation({
    mutationFn: (dataUrl: string) => api.profile.setAvatar(dataUrl),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(userId), profile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
      announce('Avatar atualizado.')
    },
    onError: (error) => toast({ title: 'Não foi possível enviar o avatar', description: getErrorMessage(error), variant: 'error' }),
  })
  const remove = useMutation({
    mutationFn: () => api.profile.removeAvatar(),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(userId), profile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
      announce('Avatar removido.')
    },
    onError: (error) => toast({ title: 'Não foi possível remover o avatar', description: getErrorMessage(error), variant: 'error' }),
  })
  return { set, remove }
}

export function useChangePassword() {
  const announce = useAnnounce()
  return useMutation({
    mutationFn: (input: PasswordChangeInput) => api.profile.changePassword(input),
    onSuccess: () => {
      toast({ title: 'Senha alterada', variant: 'success' })
      announce('Senha alterada com sucesso.')
    },
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const announce = useAnnounce()
  return useMutation({
    mutationFn: ({ slot, input }: { slot: WalletSlot; input: Partial<WalletInput> }) => api.wallets.save(slot, input),
    onSuccess: (wallets, vars) => {
      queryClient.setQueryData(queryKeys.wallets(userId), wallets)
      toast({ title: vars.slot === 'primary' ? 'Carteira principal salva' : 'Carteira secundária salva', variant: 'success' })
      announce('Carteira salva.')
    },
  })
}

export function useRemoveWallet() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const announce = useAnnounce()
  return useMutation({
    mutationFn: (slot: WalletSlot) => api.wallets.remove(slot),
    onSuccess: (wallets) => {
      queryClient.setQueryData(queryKeys.wallets(userId), wallets)
      announce('Carteira removida.')
    },
    onError: (error) => toast({ title: 'Não foi possível remover a carteira', description: getErrorMessage(error), variant: 'error' }),
  })
}
