import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4 shrink-0"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconHoy(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </IconBase>
  )
}

export function IconEntrenar(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 9.5v5M17.5 9.5v5M4 12h2.5M17.5 12H20M8.5 8.5h7v7h-7z" />
      <path d="M6.5 8.5v-1a1 1 0 0 1 1-1h1M17.5 8.5v-1a1 1 0 0 0-1-1h-1M6.5 15.5v1a1 1 0 0 0 1 1h1M17.5 15.5v1a1 1 0 0 1-1 1h-1" />
    </IconBase>
  )
}

export function IconProgreso(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15v-3M12 15V9M16 15v-6" />
      <path d="M8 12l4-3 4 2" />
    </IconBase>
  )
}

export function IconComida(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 4v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V4" />
      <path d="M10 13v7" />
      <path d="M16 4v16" />
      <path d="M16 8h2a2 2 0 0 1 0 4h-2" />
    </IconBase>
  )
}

export function IconCoach(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="9" r="4" />
      <path d="M6 20c1.5-3 4-4.5 6-4.5S16.5 17 18 20" />
      <path d="M9.5 8.5h.01M14.5 8.5h.01M10 11c.6.5 1.3.8 2 .8s1.4-.3 2-.8" />
    </IconBase>
  )
}

export function IconPerfil(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19c1.6-3.2 4-4.8 6.5-4.8S16.9 15.8 18.5 19" />
    </IconBase>
  )
}

export function IconUsuarios(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3.5 18.5c1.2-2.6 3.1-4 5.5-4s4.3 1.4 5.5 4" />
      <path d="M13.5 17.5c.7-1.4 1.8-2.2 3.2-2.2 1.2 0 2.2.6 2.8 1.7" />
    </IconBase>
  )
}
