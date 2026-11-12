import type { Exercise, LoadType, Workout } from '../types/database'

export interface SetRow {
  exercise_id: string
  reps: number | null
  weight_kg: number | null
  duration_sec: number | null
  workout_id: string
  performed_at: string
}

export interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  loadType: LoadType
  value: number
  unit: string
  performedAt: string
}

export interface WeekBucket {
  label: string
  start: Date
  sets: number
  workouts: number
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayKey(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10)
}

export function computeStreak(workouts: Workout[], today = new Date()): number {
  if (workouts.length === 0) return 0

  const days = new Set(workouts.map((w) => dayKey(new Date(w.performed_at))))
  let cursor = startOfDay(today)

  // Si hoy no entrenó, la racha puede seguir desde ayer
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeWeeklyVolume(
  workouts: Workout[],
  setRows: SetRow[],
  weeks = 8,
): WeekBucket[] {
  const now = startOfDay(new Date())
  const buckets: WeekBucket[] = []

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(now)
    start.setDate(start.getDate() - i * 7 - ((now.getDay() + 6) % 7)) // lunes
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    const label = start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    const workoutIds = new Set(
      workouts
        .filter((w) => {
          const t = new Date(w.performed_at).getTime()
          return t >= start.getTime() && t < end.getTime()
        })
        .map((w) => w.id),
    )

    const sets = setRows.filter((s) => workoutIds.has(s.workout_id)).length
    buckets.push({ label, start, sets, workouts: workoutIds.size })
  }

  return buckets
}

function scoreForSet(
  loadType: LoadType,
  set: Pick<SetRow, 'reps' | 'weight_kg' | 'duration_sec'>,
): { value: number; unit: string } | null {
  if (loadType === 'reps_weight') {
    if (set.weight_kg == null) return null
    return { value: Number(set.weight_kg), unit: 'kg' }
  }
  if (loadType === 'reps') {
    if (set.reps == null) return null
    return { value: Number(set.reps), unit: 'reps' }
  }
  if (set.duration_sec == null) return null
  return { value: Number(set.duration_sec), unit: 's' }
}

export function computePersonalRecords(
  setRows: SetRow[],
  exercises: Exercise[],
  limit = 8,
): PersonalRecord[] {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const best = new Map<string, PersonalRecord>()

  for (const row of setRows) {
    const exercise = byId.get(row.exercise_id)
    if (!exercise) continue
    const scored = scoreForSet(exercise.load_type, row)
    if (!scored) continue

    const current = best.get(row.exercise_id)
    if (!current || scored.value > current.value) {
      best.set(row.exercise_id, {
        exerciseId: row.exercise_id,
        exerciseName: exercise.name,
        loadType: exercise.load_type,
        value: scored.value,
        unit: scored.unit,
        performedAt: row.performed_at,
      })
    }
  }

  return Array.from(best.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export function weightSeries(
  metrics: Array<{ recorded_at: string; weight_kg: number | null }>,
): Array<{ label: string; value: number }> {
  return metrics
    .filter((m) => m.weight_kg != null)
    .slice()
    .reverse()
    .map((m) => ({
      label: new Date(m.recorded_at).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
      }),
      value: Number(m.weight_kg),
    }))
}
