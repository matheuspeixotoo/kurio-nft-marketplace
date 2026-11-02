import type { SVGProps } from 'react'

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path
        fill="#3B5999"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  )
}

/** "Thank you" envelope from the confirmation layout (redrawn as an inline icon). */
export function ThankYouIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 72 80" width="72" height="80" fill="none" stroke="#E89B55" strokeWidth="2.5" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M36 2c-9 0-16 7-16 16v10h32V18c0-9-7-16-16-16Z" />
      <path d="M6 30h60v46H6z" />
      <path d="M6 30l30 24 30-24" />
      <path d="M6 76l22-22M66 76L44 54" />
      <text x="36" y="26" textAnchor="middle" fontFamily="Roboto Mono, monospace" fontSize="8.5" fontWeight="700" fill="#E89B55" stroke="none">
        THANK
      </text>
      <text x="36" y="36" textAnchor="middle" fontFamily="Roboto Mono, monospace" fontSize="8.5" fontWeight="700" fill="#E89B55" stroke="none">
        YOU
      </text>
    </svg>
  )
}

type BrandProps = SVGProps<SVGSVGElement> & { className?: string }
const brand = (d: string) =>
  function BrandIcon(props: BrandProps) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
        <path d={d} />
      </svg>
    )
  }

export const FacebookGlyph = brand('M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z')
export const InstagramGlyph = brand(
  'M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21 8.2c-.1-1.5-.4-2.8-1.5-3.9S17.2 2.9 15.8 2.8C14.3 2.7 9.7 2.7 8.2 2.8 6.7 2.9 5.4 3.2 4.3 4.3S2.9 6.8 2.8 8.2c-.1 1.5-.1 6.1 0 7.6.1 1.5.4 2.8 1.5 3.9s2.4 1.4 3.9 1.5c1.5.1 6.1.1 7.6 0 1.5-.1 2.8-.4 3.9-1.5s1.4-2.4 1.5-3.9c.1-1.5.1-6.1 0-7.6Zm-2 9.3a3 3 0 0 1-1.7 1.7c-1.2.5-4 .4-5.3.4s-4.1.1-5.3-.4A3 3 0 0 1 5 17.5c-.5-1.2-.4-4-.4-5.3s-.1-4.1.4-5.3A3 3 0 0 1 6.7 5.2c1.2-.5 4-.4 5.3-.4s4.1-.1 5.3.4A3 3 0 0 1 19 6.9c.5 1.2.4 4 .4 5.3s.1 4.1-.4 5.3Z',
)
export const TwitterGlyph = brand('M18.9 2H22l-7 8 8.3 12h-6.5l-5.1-6.7L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.6 6.1L18.9 2Zm-1.1 18.1h1.7L8.3 3.8H6.5l11.3 16.3Z')
export const LinkedinGlyph = brand(
  'M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6ZM8 19H5V9.5h3V19ZM6.5 8.2a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5ZM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19h-3V9.5h2.8v1.3h.1c.4-.8 1.4-1.5 2.8-1.5 3 0 3.6 2 3.6 4.6V19Z',
)
export const YoutubeGlyph = brand(
  'M23 7.2a2.9 2.9 0 0 0-2-2C19.2 4.7 12 4.7 12 4.7s-7.2 0-9 .5a2.9 2.9 0 0 0-2 2C.5 9 .5 12 .5 12s0 3 .5 4.8a2.9 2.9 0 0 0 2 2c1.8.5 9 .5 9 .5s7.2 0 9-.5a2.9 2.9 0 0 0 2-2c.5-1.8.5-4.8.5-4.8s0-3-.5-4.8ZM9.7 15.1V8.9l6 3.1-6 3.1Z',
)

export function WalletGlyph({ letter, className }: { letter: string; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-raised text-[13px] font-bold text-primary-light ring-1 ring-primary/40">
        {letter}
      </span>
    </span>
  )
}

export function ScanGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}
