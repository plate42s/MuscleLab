import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const baseNav = [
  { to: '/', label: 'Hoy', end: true },
  { to: '/entrenar', label: 'Entrenar' },
  { to: '/progreso', label: 'Progreso' },
  { to: '/comida', label: 'Comida' },
  { to: '/coach', label: 'Coach' },
  { to: '/perfil', label: 'Perfil' },
]

export function Layout() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const navItems = isAdmin
    ? [
        ...baseNav.slice(0, 5),
        { to: '/usuarios', label: 'Usuarios', end: false },
        baseNav[5],
      ]
    : baseNav

  return (
    <div className="ml-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
      <aside className="ml-aside hidden p-6 md:flex md:w-60 md:flex-col md:gap-6">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight ml-title">
            Muscle<span style={{ color: 'var(--ml-gold-dark)' }}>Lab</span>
          </p>
          <p className="mt-1 text-xs ml-muted">Laboratorio de progreso</p>
          <div className="ml-brand-bar mt-3" />
        </div>
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  isActive ? 'ml-nav-active' : 'ml-nav-idle',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-[var(--ml-gold-line)] bg-[var(--ml-gold-soft)]/70 p-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--ml-deep)' }}>
            Paleta activa
          </p>
          <div className="mt-2 flex gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ml-crimson)' }} />
            <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ml-gold)' }} />
            <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ml-rose)' }} />
            <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ml-oat)' }} />
            <span className="h-3 w-3 rounded-full" style={{ background: 'var(--ml-deep)' }} />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pb-24 md:pb-0">
        <header className="ml-header px-4 py-4 md:px-8">
          <p className="font-display text-lg font-semibold ml-title md:hidden">
            Muscle<span style={{ color: 'var(--ml-gold-dark)' }}>Lab</span>
          </p>
          <p className="hidden text-sm md:block ml-muted">
            Vista detalle · registra en móvil, analiza aquí
          </p>
        </header>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="ml-bottom-nav fixed inset-x-0 bottom-0 z-20 px-2 py-2 md:hidden">
        <div
          className="mx-auto grid max-w-lg gap-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-lg px-1 py-2 text-center text-[10px] font-semibold transition sm:text-[11px]',
                  isActive ? 'ml-nav-mobile-active' : 'ml-nav-idle',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
