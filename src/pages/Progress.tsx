import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BodyMetricsPanel } from '../components/BodyMetricsPanel'
import { SimpleBars } from '../components/SimpleBars'
import { useAuth } from '../context/AuthContext'
import {
  computePersonalRecords,
  computeStreak,
  computeWeeklyVolume,
  type SetRow,
} from '../lib/progressStats'
import { supabase } from '../lib/supabase'
import type { BodyMetric, Exercise, Workout, WorkoutListItem } from '../types/database'

export function Progress() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([])
  const [rawWorkouts, setRawWorkouts] = useState<Workout[]>([])
  const [setRows, setSetRows] = useState<SetRow[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    const workoutRows = (workoutsRes.data as Array<{
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
    setRawWorkouts(
      workoutRows.map(({ workout_sets: _sets, ...w }) => w),
    )
    setSetRows(flatSets)
    setExercises((exercisesRes.data as Exercise[]) ?? [])

    if (metricsRes.error) {
      // Tabla aún no creada: no bloqueamos el resto de F2
      setMetrics([])
    } else {
      setMetrics((metricsRes.data as BodyMetric[]) ?? [])
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const streak = useMemo(() => computeStreak(rawWorkouts), [rawWorkouts])
  const weekly = useMemo(
    () => computeWeeklyVolume(rawWorkouts, setRows, 8),
    [rawWorkouts, setRows],
  )
  const prs = useMemo(
    () => computePersonalRecords(setRows, exercises, 8),
    [setRows, exercises],
  )

  const sessionsThisWeek = weekly[weekly.length - 1]?.workouts ?? 0
  const setsThisWeek = weekly[weekly.length - 1]?.sets ?? 0

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold ml-title">Progreso</h1>
        <p className="text-sm ml-muted">PRs, rachas, volumen y medidas</p>
      </div>

      {loading && <p className="text-sm ml-muted">Cargando progreso…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card card-accent">
              <p className="text-xs ml-muted">Racha</p>
              <p className="font-display text-3xl font-bold ml-title">{streak}</p>
              <p className="text-xs ml-muted">días seguidos</p>
            </div>
            <div className="card card-accent">
              <p className="text-xs ml-muted">Esta semana</p>
              <p className="font-display text-3xl font-bold ml-title">{sessionsThisWeek}</p>
              <p className="text-xs ml-muted">sesiones</p>
            </div>
            <div className="card card-accent">
              <p className="text-xs ml-muted">Volumen semanal</p>
              <p className="font-display text-3xl font-bold ml-title">{setsThisWeek}</p>
              <p className="text-xs ml-muted">series</p>
            </div>
          </div>

          <div className="card card-accent space-y-3">
            <h2 className="font-semibold ml-title">Volumen por semana</h2>
            <SimpleBars
              items={weekly.map((w) => ({ label: w.label, value: w.sets }))}
              unit="series"
              emptyText="Entrena para ver el volumen semanal"
            />
          </div>

          <div className="card card-accent space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold ml-title">Récords personales</h2>
              <span className="badge-gold">PRs</span>
            </div>
            {prs.length === 0 ? (
              <p className="text-sm ml-muted">Aún no hay PRs. Registra series con reps/peso/tiempo.</p>
            ) : (
              <div className="overflow-x-auto">
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
                        <td className="font-semibold" style={{ color: 'var(--ml-gold-dark)' }}>
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
            )}
          </div>

          {user && (
            <BodyMetricsPanel userId={user.id} metrics={metrics} onChanged={load} />
          )}

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
                  className="card block transition hover:border-[var(--ml-gold)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold ml-title">{workout.title ?? 'Sesión'}</h3>
                      <p className="mt-1 text-sm ml-muted">
                        {new Date(workout.performed_at).toLocaleString('es-MX')}
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
        </>
      )}
    </div>
  )
}
