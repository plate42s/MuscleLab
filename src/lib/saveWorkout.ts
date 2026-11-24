import { supabase } from './supabase'
import type { WorkoutExerciseDraft, WorkoutSetDraft } from '../types/database'

export type SaveWorkoutInput = {
  userId: string
  title: string
  notes: string
  items: WorkoutExerciseDraft[]
  elapsedMs: number
}

export type SaveWorkoutResult =
  | { ok: true; workoutId: string }
  | { ok: false; error: string }

/** Misma regla que Train: completed || hasData en reps/weight/duration/rpe */
export function isPersistableSet(set: WorkoutSetDraft): boolean {
  if (set.completed) return true
  return Boolean(set.reps || set.weight_kg || set.duration_sec || set.rpe)
}

/** Error de validación previa a BD, o null si se puede persistir. */
export function validateWorkoutForSave(items: WorkoutExerciseDraft[]): string | null {
  if (items.length === 0) return 'Añade al menos un ejercicio'
  const setsToSave = items.flatMap((item) => item.sets.filter(isPersistableSet))
  if (setsToSave.length === 0) return 'Completa al menos una serie'
  return null
}

function buildSetRows(workoutId: string, items: WorkoutExerciseDraft[]) {
  return items.flatMap((item) => {
    const kept = item.sets.filter(isPersistableSet)
    return kept.map((set, index) => ({
      workout_id: workoutId,
      exercise_id: item.exercise.id,
      set_index: index + 1,
      reps: set.reps ? Number(set.reps) : null,
      weight_kg: set.weight_kg ? Number(set.weight_kg) : null,
      duration_sec: set.duration_sec ? Number(set.duration_sec) : null,
      rpe: set.rpe ? Number(set.rpe) : null,
    }))
  })
}

async function deleteWorkoutCompensating(workoutId: string): Promise<string | null> {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
  return error?.message ?? null
}

/**
 * Persiste workouts + workout_sets. Sin navegación ni mutación de UI.
 * Rollback compensatorio si falla el insert de sets (o si no hay filas).
 */
export async function saveWorkout(input: SaveWorkoutInput): Promise<SaveWorkoutResult> {
  const { userId, title, notes, items, elapsedMs } = input

  const validationError = validateWorkoutForSave(items)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const durationMin = Math.max(1, Math.round(elapsedMs / 60000))

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      title: title.trim() || `Sesión ${new Date().toLocaleDateString('es-MX')}`,
      notes: notes.trim() || null,
      performed_at: new Date().toISOString(),
      duration_min: durationMin,
    })
    .select('*')
    .single()

  if (workoutError || !workout) {
    return {
      ok: false,
      error: workoutError?.message ?? 'No se pudo crear la sesión',
    }
  }

  const rows = buildSetRows(workout.id as string, items)

  if (rows.length === 0) {
    const rollbackError = await deleteWorkoutCompensating(workout.id as string)
    if (rollbackError) {
      return {
        ok: false,
        error: `Completa al menos una serie (además no se pudo revertir el workout: ${rollbackError})`,
      }
    }
    return { ok: false, error: 'Completa al menos una serie' }
  }

  const { error: setsError } = await supabase.from('workout_sets').insert(rows)

  if (setsError) {
    const rollbackError = await deleteWorkoutCompensating(workout.id as string)
    if (rollbackError) {
      return {
        ok: false,
        error: `${setsError.message} (además no se pudo revertir el workout: ${rollbackError})`,
      }
    }
    return { ok: false, error: setsError.message }
  }

  return { ok: true, workoutId: workout.id as string }
}
