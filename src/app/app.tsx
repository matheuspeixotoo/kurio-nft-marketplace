import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './query-client'
import { router } from './router'
import { AuthProvider, useAuth } from '@/features/auth/auth-context'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { Toaster } from '@/components/ui/toast'
import { LiveAnnouncerProvider } from '@/components/live-announcer'
import { TooltipProvider } from '@/components/ui/tooltip'

function RouterWithContext() {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ queryClient, auth }} />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LiveAnnouncerProvider>
        <AuthProvider>
          <RealtimeProvider>
            <TooltipProvider delayDuration={200}>
              <RouterWithContext />
            </TooltipProvider>
            <Toaster />
          </RealtimeProvider>
        </AuthProvider>
      </LiveAnnouncerProvider>
    </QueryClientProvider>
  )
}
