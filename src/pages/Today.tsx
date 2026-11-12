import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Workout } from '../types/database'

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function Today() {
  const { profile, user } = useAuth()
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('performed_at', startOfTodayIso())
      .order('performed_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setTodayWorkouts((data as Workout[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold ml-title">
          Hola{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="mt-1 text-sm ml-muted">
          Modalidad: {profile?.modality ?? 'mixto'} · Objetivo: {profile?.goal ?? 'mixto'}
          {profile?.role === 'admin' && <span className="badge-gold ml-2">admin</span>}
        </p>
      </div>

      <div className="card card-accent space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold ml-title">Hoy</h2>
          <span className="badge-gold">Sesión</span>
        </div>
        {loading && <p className="text-sm ml-muted">Cargando…</p>}
        {!loading && todayWorkouts.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--ml-ink-soft)' }}>
            Aún no registras una sesión hoy.
          </p>
        )}
        {!loading &&
          todayWorkouts.map((workout) => (
            <Link
              key={workout.id}
              to={`/progreso/${workout.id}`}
              className="block rounded-xl border border-[var(--ml-gold-line)] bg-white/70 px-3 py-3 transition hover:bg-[var(--ml-gold-soft)]"
            >
              <span className="font-medium ml-title">{workout.title ?? 'Sesión'}</span>
              <span className="mt-1 block text-xs ml-muted">
                {new Date(workout.performed_at).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </Link>
          ))}
        <Link className="btn-primary w-full" to="/entrenar">
          Empezar entreno
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card card-accent">
          <p className="badge-gold">Próximamente</p>
          <p className="mt-2 font-medium ml-title">Coach IA</p>
          <p className="text-sm ml-muted">Ajuste de sesión y rutina base</p>
        </div>
        <Link to="/comida" className="card card-accent block transition hover:border-[var(--ml-gold)]">
          <p className="badge-gold">F3</p>
          <p className="mt-2 font-medium ml-title">Comida</p>
          <p className="text-sm ml-muted">Calorías y macros del día</p>
        </Link>
      </div>
    </div>
  )
}
