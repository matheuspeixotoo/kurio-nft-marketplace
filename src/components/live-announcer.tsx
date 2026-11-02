import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Politeness = 'polite' | 'assertive'
type Announce = (message: string, politeness?: Politeness) => void

const AnnouncerContext = createContext<Announce>(() => {})

/** Global aria-live regions so mutations and realtime updates are announced to screen readers. */
export function LiveAnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite
    set('')
    // Re-set on the next frame so identical consecutive messages are still announced.
    requestAnimationFrame(() => set(message))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setPolite('')
      setAssertive('')
    }, 6000)
  }, [])

  const value = useMemo(() => announce, [announce])
  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="live-assertive">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  )
}

export function useAnnounce() {
  return useContext(AnnouncerContext)
}
