import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { computeStreak } from '../lib/progressStats'
import { supabase } from '../lib/supabase'
import type { Workout } from '../types/database'

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfWeekIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const mondayOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - mondayOffset)
  return d.toISOString()
}

function daySummaryLabel(date = new Date()) {
  const day = date.toLocaleDateString('es-MX', { weekday: 'long' }).toUpperCase()
  return `${day} · RESUMEN`
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function Today() {
  const { profile, user } = useAuth()
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('performed_at', startOfTodayIso())
        .order('performed_at', { ascending: false }),
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('performed_at', { ascending: false })
        .limit(60),
    ]).then(([todayRes, recentRes]) => {
      if (cancelled) return
      setTodayWorkouts((todayRes.data as Workout[]) ?? [])
      setRecentWorkouts((recentRes.data as Workout[]) ?? [])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  const weekSessions = useMemo(() => {
    const weekStart = new Date(startOfWeekIso()).getTime()
    return recentWorkouts.filter((w) => new Date(w.performed_at).getTime() >= weekStart).length
  }, [recentWorkouts])

  const streak = useMemo(() => computeStreak(recentWorkouts), [recentWorkouts])
  const greetingName = profile?.display_name?.trim() || 'atleta'

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)] lg:items-start">
      {/* Móvil: saludo corto → CTA entrenamiento → stats 2 cols */}
      <section className="space-y-3 md:space-y-4">
        <div className="ml-stat-card !py-3 md:!py-4">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--ml-primary)' }}
          >
            {daySummaryLabel()}
          </p>
          <h2 className="mt-1.5 font-display text-[1.65rem] font-bold leading-tight tracking-tight ml-title md:text-3xl">
            Hola, {greetingName}
          </h2>
          <p className="mt-1.5 text-sm ml-muted">
            {profile?.modality ?? 'mixto'} · {profile?.goal ?? 'mixto'}
          </p>
        </div>

        <div className="ml-stat-card space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
              Entrenamiento
            </p>
            <h3 className="mt-1 text-xl font-bold ml-title md:text-lg md:font-semibold">
              Sesión de hoy
            </h3>
          </div>

          {loading && <p className="text-sm ml-muted">Cargando…</p>}

          {!loading && todayWorkouts.length === 0 && (
            <p className="text-sm ml-muted">Aún no registras una sesión hoy.</p>
          )}

          {!loading && todayWorkouts.length > 0 && (
            <ul className="space-y-2">
              {todayWorkouts.map((workout) => (
                <li key={workout.id}>
                  <Link
                    to={`/progreso/${workout.id}`}
                    className="block rounded-xl border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 py-3 transition active:border-[var(--ml-primary)]"
                  >
                    <span className="font-medium ml-title">{workout.title ?? 'Sesión'}</span>
                    <span className="mt-0.5 block text-xs ml-muted">
                      {new Date(workout.performed_at).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link className="btn-primary min-h-12 w-full text-base md:min-h-0 md:text-sm" to="/entrenar">
            Empezar entrenamiento
          </Link>
        </div>
      </section>

      <aside className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <div className="ml-stat-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">Sesiones</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums ml-title">
            {loading ? '—' : pad2(weekSessions)}
          </p>
          <p className="mt-1 text-xs ml-muted">Esta semana</p>
        </div>
        <div className="ml-stat-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">Racha</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums ml-title">
            {loading ? '—' : pad2(streak)}
          </p>
          <p className="mt-1 text-xs ml-muted">Días seguidos</p>
        </div>
        <div className="ml-stat-card col-span-2 lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
            Grasa corporal
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums ml-title">
            {profile?.body_fat_pct != null ? `${profile.body_fat_pct}%` : '—'}
          </p>
          <p className="mt-1 text-xs ml-muted">
            {profile?.body_fat_pct != null ? (
              'Desde tu perfil'
            ) : (
              <Link to="/perfil" className="underline" style={{ color: 'var(--ml-primary)' }}>
                Definir en Perfil
              </Link>
            )}
          </p>
        </div>
        <Link
          to="/comida"
          className="ml-stat-card col-span-2 hidden transition hover:border-[var(--ml-primary)] lg:col-span-1 lg:block"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">Comida</p>
          <p className="mt-1 font-semibold ml-title">Registrar macros</p>
          <p className="mt-1 text-xs ml-muted">Calorías del día</p>
        </Link>
      </aside>
    </div>
  )
}
