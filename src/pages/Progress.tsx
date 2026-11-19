import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BodyMetricsPanel } from '../components/BodyMetricsPanel'
import { SimpleBars } from '../components/SimpleBars'
import { useAuth } from '../context/AuthContext'
import {
  bodyFatSeries,
  computePersonalRecords,
  computeStreak,
  computeWeeklyVolume,
  weightSeries,
  type SetRow,
} from '../lib/progressStats'
import { supabase } from '../lib/supabase'
import type { BodyMetric, Exercise, Workout, WorkoutListItem } from '../types/database'

type ChartMode = 'peso' | 'grasa' | 'volumen'

const CHART_STORAGE_KEY = 'ml.progress.chartMode'

function readChartMode(): ChartMode {
  try {
    const raw = localStorage.getItem(CHART_STORAGE_KEY)
    if (raw === 'peso' || raw === 'grasa' || raw === 'volumen') return raw
  } catch {
    /* ignore */
  }
  return 'peso'
}

export function Progress() {
  const { user, profile } = useAuth()
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [rawWorkouts, setRawWorkouts] = useState<Workout[]>([])
  const [setRows, setSetRows] = useState<SetRow[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartMode, setChartMode] = useState<ChartMode>(() => readChartMode())
  const [metricsOpenMobile, setMetricsOpenMobile] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const [workoutsRes, exercisesRes, metricsRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, workout_sets(id, exercise_id, reps, weight_kg, duration_sec)')
        .eq('user_id', user.id)
        .order('performed_at', { ascending: false }),
      supabase.from('exercises').select('*').eq('is_active', true),
      supabase
        .from('body_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false }),
    ])

    setLoading(false)

    if (workoutsRes.error) {
      setError(workoutsRes.error.message)
      return
    }

    const workoutRows =
      (workoutsRes.data as Array<{
        id: string
        user_id: string
        performed_at: string
        title: string | null
        notes: string | null
        duration_min: number | null
        created_at: string
        workout_sets: Array<{
          id: string
          exercise_id: string
          reps: number | null
          weight_kg: number | null
          duration_sec: number | null
        }> | null
      }>) ?? []

    const mapped: WorkoutListItem[] = workoutRows.map((row) => {
      const sets = row.workout_sets ?? []
      const exerciseIds = new Set(sets.map((s) => s.exercise_id))
      return {
        id: row.id,
        user_id: row.user_id,
        performed_at: row.performed_at,
        title: row.title,
        notes: row.notes,
        duration_min: row.duration_min,
        created_at: row.created_at,
        set_count: sets.length,
        exercise_count: exerciseIds.size,
      }
    })

    const flatSets: SetRow[] = workoutRows.flatMap((row) =>
      (row.workout_sets ?? []).map((s) => ({
        exercise_id: s.exercise_id,
        reps: s.reps,
        weight_kg: s.weight_kg,
        duration_sec: s.duration_sec,
        workout_id: row.id,
        performed_at: row.performed_at,
      })),
    )

    setWorkouts(mapped)
    setRawWorkouts(workoutRows.map(({ workout_sets: _sets, ...w }) => w))
    setSetRows(flatSets)
    setExercises((exercisesRes.data as Exercise[]) ?? [])

    if (metricsRes.error) {
      setMetrics([])
    } else {
      setMetrics((metricsRes.data as BodyMetric[]) ?? [])
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    try {
      localStorage.setItem(CHART_STORAGE_KEY, chartMode)
    } catch {
      /* ignore */
    }
  }, [chartMode])

  const streak = useMemo(() => computeStreak(rawWorkouts), [rawWorkouts])
  const weekly = useMemo(
    () => computeWeeklyVolume(rawWorkouts, setRows, 8),
    [rawWorkouts, setRows],
  )
  const prs = useMemo(
    () => computePersonalRecords(setRows, exercises, 8),
    [setRows, exercises],
  )
  const weightChart = useMemo(() => weightSeries(metrics).slice(-8), [metrics])
  const fatChart = useMemo(() => bodyFatSeries(metrics).slice(-8), [metrics])

  const sessionsThisWeek = weekly[weekly.length - 1]?.workouts ?? 0
  const setsThisWeek = weekly[weekly.length - 1]?.sets ?? 0

  const primaryChart = useMemo(() => {
    if (chartMode === 'volumen') {
      return {
        title: 'Volumen por semana',
        items: weekly.map((w) => ({ label: w.label, value: w.sets })),
        unit: 'series',
        empty: 'Entrena para ver el volumen semanal',
      }
    }
    if (chartMode === 'grasa') {
      return {
        title: 'Evolución de grasa corporal',
        items: fatChart,
        unit: '%',
        empty: 'Registra grasa % en medidas para ver la evolución',
      }
    }
    return {
      title: 'Evolución de peso',
      items: weightChart,
      unit: 'kg',
      empty: 'Registra peso en medidas para ver la evolución',
    }
  }, [chartMode, weekly, fatChart, weightChart])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="hidden md:block">
        <h1 className="font-display text-2xl font-bold ml-title">Progreso</h1>
        <p className="text-sm ml-muted">Resumen, evolución, PRs y medidas</p>
      </div>

      {loading && <p className="text-sm ml-muted">Cargando progreso…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)] lg:items-start">
          {/* Columna principal */}
          <div className="space-y-4">
            {/* Resumen: móvil 2 cols, desktop 3–4 */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="ml-stat-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
                  Racha
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums ml-title">
                  {streak}
                </p>
                <p className="mt-1 text-xs ml-muted">días seguidos</p>
              </div>
              <div className="ml-stat-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
                  Semana
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums ml-title">
                  {sessionsThisWeek}
                </p>
                <p className="mt-1 text-xs ml-muted">sesiones</p>
              </div>
              <div className="ml-stat-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
                  Series
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums ml-title">
                  {setsThisWeek}
                </p>
                <p className="mt-1 text-xs ml-muted">esta semana</p>
              </div>
              <div className="ml-stat-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
                  Grasa
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums ml-title">
                  {profile?.body_fat_pct != null ? `${profile.body_fat_pct}%` : '—'}
                </p>
                <p className="mt-1 text-xs ml-muted">
                  {profile?.body_fat_pct != null ? (
                    'perfil'
                  ) : (
                    <Link to="/perfil" style={{ color: 'var(--ml-primary)' }} className="underline">
                      definir
                    </Link>
                  )}
                </p>
              </div>
            </div>

            {/* Gráfica: móvil solo volumen compacto; desktop selector */}
            <div className="ml-stat-card space-y-3 md:hidden">
              <h2 className="text-base font-bold ml-title">Volumen semanal</h2>
              <SimpleBars
                items={weekly.map((w) => ({ label: w.label, value: w.sets }))}
                unit="series"
                emptyText="Entrena para ver el volumen semanal"
              />
            </div>

            <div className="card space-y-3 hidden md:block">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold ml-title">{primaryChart.title}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'peso', label: 'Peso' },
                      { id: 'grasa', label: 'Grasa' },
                      { id: 'volumen', label: 'Volumen' },
                    ] as const
                  ).map((opt) => {
                    const selected = chartMode === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={selected}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                        style={
                          selected
                            ? {
                                background: 'var(--ml-primary)',
                                color: '#111315',
                              }
                            : {
                                background: 'var(--ml-elevated)',
                                color: 'var(--ml-text-muted)',
                                boxShadow: 'inset 0 0 0 1px var(--ml-border)',
                              }
                        }
                        onClick={() => setChartMode(opt.id)}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <SimpleBars
                items={primaryChart.items}
                unit={primaryChart.unit}
                emptyText={primaryChart.empty}
              />
            </div>

            {/* PRs: móvil lista corta; desktop tabla */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold ml-title">Récords personales</h2>
                <span className="badge-gold">PRs</span>
              </div>
              {prs.length === 0 ? (
                <p className="text-sm ml-muted">
                  Aún no hay PRs. Registra series con reps/peso/tiempo.
                </p>
              ) : (
                <>
                  <ul className="space-y-2 md:hidden">
                    {prs.slice(0, 4).map((pr) => (
                      <li
                        key={pr.exerciseId}
                        className="flex items-center justify-between gap-2 rounded-xl bg-[var(--ml-elevated)] px-3 py-2"
                      >
                        <span className="truncate text-sm font-medium ml-title">
                          {pr.exerciseName}
                        </span>
                        <span
                          className="shrink-0 text-sm font-bold"
                          style={{ color: 'var(--ml-primary)' }}
                        >
                          {pr.value} {pr.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="table-ml">
                      <thead>
                        <tr>
                          <th>Ejercicio</th>
                          <th>Marca</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prs.map((pr) => (
                          <tr key={pr.exerciseId}>
                            <td className="font-medium">{pr.exerciseName}</td>
                            <td
                              className="font-semibold"
                              style={{ color: 'var(--ml-primary)' }}
                            >
                              {pr.value} {pr.unit}
                            </td>
                            <td>
                              {new Date(pr.performedAt).toLocaleDateString('es-MX')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Historial completo (móvil y desktop) */}
            <div className="space-y-3">
              <h2 className="font-semibold ml-title">Historial</h2>
              {workouts.length === 0 ? (
                <div className="card space-y-3">
                  <p className="text-sm ml-muted">Todavía no hay sesiones.</p>
                  <Link className="btn-primary inline-flex" to="/entrenar">
                    Registrar la primera
                  </Link>
                </div>
              ) : (
                workouts.map((workout) => (
                  <Link
                    key={workout.id}
                    to={`/progreso/${workout.id}`}
                    className="card block transition hover:border-[var(--ml-primary)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold ml-title">
                          {workout.title ?? 'Sesión'}
                        </h3>
                        <p className="mt-1 text-sm ml-muted">
                          {new Date(workout.performed_at).toLocaleString('es-MX')}
                          {workout.duration_min != null
                            ? ` · ${workout.duration_min} min`
                            : ''}
                        </p>
                      </div>
                      <p className="text-xs font-medium ml-muted">
                        {workout.exercise_count} ej. · {workout.set_count} series
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Móvil: enlace Perfil + registro de medidas opcional */}
            <div className="space-y-3 md:hidden">
              <div className="ml-stat-card flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
                    Medidas
                  </p>
                  <p className="mt-1 text-sm ml-title">Peso, grasa y cinturas</p>
                </div>
                <div className="flex gap-2">
                  <Link to="/perfil" className="btn-secondary !px-3 !py-2 text-xs">
                    Perfil
                  </Link>
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-2 text-xs"
                    onClick={() => setMetricsOpenMobile((v) => !v)}
                  >
                    {metricsOpenMobile ? 'Ocultar' : 'Registrar'}
                  </button>
                </div>
              </div>
              {metricsOpenMobile && user && (
                <BodyMetricsPanel userId={user.id} metrics={metrics} onChanged={load} />
              )}
            </div>
          </div>

          {/* Desktop: panel lateral de medidas */}
          <aside className="hidden space-y-4 md:block lg:sticky lg:top-24">
            {user && (
              <BodyMetricsPanel userId={user.id} metrics={metrics} onChanged={load} />
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
