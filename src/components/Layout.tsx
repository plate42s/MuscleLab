import type { LucideIcon } from 'lucide-react'
import {
  Apple,
  Dumbbell,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type NavItem = { to: string; label: string; end?: boolean; Icon: LucideIcon }

const baseNav: NavItem[] = [
  { to: '/', label: 'Hoy', end: true, Icon: LayoutGrid },
  { to: '/entrenar', label: 'Entrenar', Icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', Icon: TrendingUp },
  { to: '/comida', label: 'Comida', Icon: Apple },
  { to: '/coach', label: 'Coach', Icon: Sparkles },
  { to: '/perfil', label: 'Perfil', Icon: User },
]

/** Bottom bar móvil: 4 acciones principales. Comida/Coach/Usuarios van en Perfil. */
const mobileNav: NavItem[] = [
  { to: '/', label: 'Hoy', end: true, Icon: LayoutGrid },
  { to: '/entrenar', label: 'Entrenar', Icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', Icon: TrendingUp },
  { to: '/perfil', label: 'Perfil', Icon: User },
]

const sectionMeta: Array<{ match: (path: string) => boolean; title: string; context: string }> = [
  {
    match: (p) => p === '/',
    title: 'Hoy',
    context: 'Resumen del día · sesiones y racha',
  },
  {
    match: (p) => p.startsWith('/entrenar'),
    title: 'Entrenar',
    context: 'Registro de sesión · series y RPE',
  },
  {
    match: (p) => /^\/progreso\/[^/]+/.test(p),
    title: 'Detalle',
    context: 'Progreso · historial de entrenamiento',
  },
  {
    match: (p) => p.startsWith('/progreso'),
    title: 'Progreso',
    context: 'Historial, volumen y marcas',
  },
  {
    match: (p) => p.startsWith('/comida'),
    title: 'Comida',
    context: 'Calorías y macros del día',
  },
  {
    match: (p) => p.startsWith('/coach'),
    title: 'Coach',
    context: 'max ia steel · asistencia deportiva',
  },
  {
    match: (p) => p.startsWith('/usuarios'),
    title: 'Usuarios',
    context: 'Administración · cuentas y roles',
  },
  {
    match: (p) => p.startsWith('/perfil'),
    title: 'Perfil',
    context: 'Cuenta, modalidad y objetivo',
  },
]

function resolveSection(pathname: string) {
  return (
    sectionMeta.find((s) => s.match(pathname)) ?? {
      title: 'MuscleLab',
      context: 'Laboratorio de progreso',
    }
  )
}

export function Layout() {
  const { profile } = useAuth()
  const location = useLocation()
  const isAdmin = profile?.role === 'admin'
  const section = resolveSection(location.pathname)

  const desktopNav: NavItem[] = isAdmin
    ? [
        ...baseNav.slice(0, 5),
        { to: '/usuarios', label: 'Usuarios', Icon: Users },
        baseNav[5],
      ]
    : baseNav

  return (
    <div className="ml-shell min-h-screen p-3 md:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl gap-4 md:min-h-[calc(100vh-2.5rem)] md:gap-5">
        {/* Desktop sidebar — sin cambios de alcance móvil */}
        <aside className="ml-aside hidden w-[240px] shrink-0 flex-col gap-5 p-5 md:sticky md:top-5 md:flex md:max-h-[calc(100vh-2.5rem)]">
          <div>
            <p className="font-display text-xl font-bold tracking-tight ml-title">
              Muscle<span style={{ color: 'var(--ml-primary)' }}>Lab</span>
            </p>
            <p
              className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--ml-primary)' }}
            >
              Menu
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {desktopNav.map(({ to, label, end, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive ? 'ml-nav-active' : 'ml-nav-idle',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3 pb-[5.5rem] md:gap-4 md:pb-0">
          {/* Header: en móvil solo logo + título de sección */}
          <header className="ml-header sticky top-3 z-20 px-3 py-2.5 md:top-5 md:px-5 md:py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-base font-semibold leading-none ml-title md:hidden">
                Muscle<span style={{ color: 'var(--ml-primary)' }}>Lab</span>
              </p>

              <div className="hidden min-w-0 md:block">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
                  {section.context}
                </p>
                <h1 className="truncate font-display text-xl font-semibold ml-title">
                  {section.title}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <h1 className="font-display text-lg font-bold ml-title md:hidden">{section.title}</h1>
                <span className="hidden text-sm ml-muted md:inline">
                  {profile?.display_name?.trim() || 'Atleta'}
                </span>
                {profile?.role === 'admin' && (
                  <span className="badge-gold hidden md:inline-flex">admin</span>
                )}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-5xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Bottom nav móvil — pill flotante */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="ml-bottom-nav pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-1 px-2.5 py-2">
          {mobileNav.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-[3.4rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center text-[11px] font-semibold transition',
                  isActive ? 'ml-nav-mobile-active' : 'ml-nav-idle',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <span className="truncate leading-none">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
