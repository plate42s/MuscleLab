import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Exercise, Workout, WorkoutSet } from '../types/database'

type SetWithExercise = WorkoutSet & { exercise: Exercise | null }

export function WorkoutDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [sets, setSets] = useState<SetWithExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .maybeSingle()

      if (cancelled) return

      if (workoutError || !workoutData) {
        setError(workoutError?.message ?? 'Sesión no encontrada')
        setLoading(false)
        return
      }

      setWorkout(workoutData as Workout)

      const { data: setsData, error: setsError } = await supabase
        .from('workout_sets')
        .select('*, exercise:exercises(*)')
        .eq('workout_id', id)
        .order('set_index')

      if (cancelled) return
      setLoading(false)

      if (setsError) {
        setError(setsError.message)
        return
      }

      setSets((setsData as SetWithExercise[]) ?? [])
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user, id])

  const grouped = useMemo(() => {
    const map = new Map<string, { exercise: Exercise | null; sets: SetWithExercise[] }>()
    for (const set of sets) {
      const key = set.exercise_id
      const current = map.get(key) ?? { exercise: set.exercise, sets: [] }
      current.sets.push(set)
      map.set(key, current)
    }
    return Array.from(map.values())
  }, [sets])

  async function removeWorkout() {
    if (!workout || !confirm('¿Eliminar esta sesión?')) return
    setDeleting(true)
    const { error: deleteError } = await supabase.from('workouts').delete().eq('id', workout.id)
    setDeleting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    navigate('/progreso')
  }

  if (loading) {
    return <p className="text-sm ml-muted">Cargando sesión…</p>
  }

  if (!workout) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error ?? 'No encontrada'}</p>
        <Link className="btn-secondary inline-flex" to="/progreso">
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/progreso" className="text-sm font-medium text-accent-dark">
            ← Historial
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold ml-title">{workout.title ?? 'Sesión'}</h1>
          <p className="text-sm ml-muted">
            {new Date(workout.performed_at).toLocaleString('es-MX')}
          </p>
        </div>
        <button className="btn-secondary !py-2 text-xs" type="button" disabled={deleting} onClick={() => void removeWorkout()}>
          {deleting ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>

      {workout.notes && <div className="card text-sm ml-muted">{workout.notes}</div>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {grouped.map((group) => (
          <div key={group.exercise?.id ?? group.sets[0]?.id} className="card space-y-2">
            <h2 className="font-semibold">{group.exercise?.name ?? 'Ejercicio'}</h2>
            <div className="overflow-x-auto">
              <table className="table-ml">
                <thead>
                  <tr>
                    <th>Serie</th>
                    <th>Reps</th>
                    <th>Peso</th>
                    <th>Tiempo</th>
                    <th>RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {group.sets.map((set) => (
                    <tr key={set.id}>
                      <td className="font-semibold text-gold-dark">{set.set_index}</td>
                      <td>{set.reps ?? '—'}</td>
                      <td>{set.weight_kg != null ? `${set.weight_kg} kg` : '—'}</td>
                      <td>{set.duration_sec != null ? `${set.duration_sec}s` : '—'}</td>
                      <td>{set.rpe ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
