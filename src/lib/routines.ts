import { supabase } from './supabase'
import { createEmptySet, createExerciseDraft } from './workoutDraft'
import type {
  Exercise,
  RoutineScheduleEntry,
  RoutineSetTemplate,
  WorkoutExerciseDraft,
  WorkoutRoutine,
  WorkoutRoutineWithItems,
} from '../types/database'

/** Orden UI Lun→Dom (valores Date#getDay) */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
}

export function todayWeekday(date = new Date()) {
  return date.getDay()
}

function asStr(v: string | number | null | undefined) {
  if (v == null || v === '') return ''
  return String(v)
}

export async function listExerciseFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('exercise_favorites')
    .select('exercise_id')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((r) => r.exercise_id as string)
}

export async function toggleExerciseFavorite(
  userId: string,
  exerciseId: string,
  currentlyFavorite: boolean,
): Promise<void> {
  if (currentlyFavorite) {
    const { error } = await supabase
      .from('exercise_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('exercise_favorites').insert({
    user_id: userId,
    exercise_id: exerciseId,
  })
  if (error) throw error
}

export async function listRoutines(userId: string): Promise<WorkoutRoutine[]> {
  const { data, error } = await supabase
    .from('workout_routines')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as WorkoutRoutine[]) ?? []
}

export async function loadRoutineWithItems(
  routineId: string,
): Promise<WorkoutRoutineWithItems | null> {
  const { data: routine, error: routineError } = await supabase
    .from('workout_routines')
    .select('*')
    .eq('id', routineId)
    .maybeSingle()
  if (routineError) throw routineError
  if (!routine) return null

  const { data: items, error: itemsError } = await supabase
    .from('workout_routine_items')
    .select('*, exercise:exercises(*)')
    .eq('routine_id', routineId)
    .order('sort_index', { ascending: true })
  if (itemsError) throw itemsError

  return {
    ...(routine as WorkoutRoutine),
    items: (items ?? []).map((row) => {
      const r = row as {
        id: string
        routine_id: string
        exercise_id: string
        sort_index: number
        sets: RoutineSetTemplate[] | null
        exercise: Exercise
      }
      return {
        id: r.id,
        routine_id: r.routine_id,
        exercise_id: r.exercise_id,
        sort_index: r.sort_index,
        sets: Array.isArray(r.sets) ? r.sets : [],
        exercise: r.exercise,
      }
    }),
  }
}

export function routineToDrafts(routine: WorkoutRoutineWithItems): {
  title: string
  notes: string
  items: WorkoutExerciseDraft[]
} {
  const items = routine.items.map((item) => {
    const draft = createExerciseDraft(item.exercise)
    const templates = item.sets.length > 0 ? item.sets : [{}]
    draft.sets = templates.map((t, index) => ({
      ...createEmptySet(index + 1),
      reps: asStr(t.reps),
      weight_kg: asStr(t.weight_kg),
      duration_sec: asStr(t.duration_sec),
      rpe: asStr(t.rpe),
      completed: false,
    }))
    return draft
  })
  return {
    title: routine.name,
    notes: routine.notes ?? '',
    items,
  }
}

export async function saveRoutineFromSession(params: {
  userId: string
  name: string
  notes?: string
  items: WorkoutExerciseDraft[]
}): Promise<{ id: string; updated: boolean }> {
  const { userId, name, notes, items } = params
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Pon un nombre a la rutina')
  if (items.length === 0) throw new Error('Añade al menos un ejercicio')

  // Mismo nombre + mismo usuario → actualizar (no crear duplicados)
  const { data: existingRows, error: findError } = await supabase
    .from('workout_routines')
    .select('id, updated_at')
    .eq('user_id', userId)
    .ilike('name', trimmedName)
    .order('updated_at', { ascending: false })
  if (findError) throw findError

  const existing = existingRows ?? []
  let routineId: string
  let updated = false

  if (existing.length > 0) {
    routineId = existing[0].id as string
    updated = true
    const duplicateIds = existing.slice(1).map((r) => r.id as string)
    if (duplicateIds.length > 0) {
      const { error: dupError } = await supabase
        .from('workout_routines')
        .delete()
        .in('id', duplicateIds)
      if (dupError) throw dupError
    }

    const { error: updateError } = await supabase
      .from('workout_routines')
      .update({
        name: trimmedName,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', routineId)
    if (updateError) throw updateError

    const { error: clearError } = await supabase
      .from('workout_routine_items')
      .delete()
      .eq('routine_id', routineId)
    if (clearError) throw clearError
  } else {
    const { data: routine, error: routineError } = await supabase
      .from('workout_routines')
      .insert({
        user_id: userId,
        name: trimmedName,
        notes: notes?.trim() || null,
        is_favorite: false,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (routineError || !routine) {
      throw routineError ?? new Error('No se pudo guardar la rutina')
    }
    routineId = routine.id as string
  }

  const rows = items.map((item, index) => ({
    routine_id: routineId,
    exercise_id: item.exercise.id,
    sort_index: index + 1,
    sets: item.sets.map((s) => ({
      reps: s.reps || null,
      weight_kg: s.weight_kg || null,
      duration_sec: s.duration_sec || null,
      rpe: s.rpe || null,
    })),
  }))

  const { error: itemsError } = await supabase.from('workout_routine_items').insert(rows)
  if (itemsError) {
    if (!updated) await supabase.from('workout_routines').delete().eq('id', routineId)
    throw itemsError
  }
  return { id: routineId, updated }
}

export async function toggleRoutineFavorite(
  routineId: string,
  currentlyFavorite: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('workout_routines')
    .update({
      is_favorite: !currentlyFavorite,
      updated_at: new Date().toISOString(),
    })
    .eq('id', routineId)
  if (error) throw error
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const { error } = await supabase.from('workout_routines').delete().eq('id', routineId)
  if (error) throw error
}

export async function listRoutineSchedule(
  userId: string,
): Promise<RoutineScheduleEntry[]> {
  const { data, error } = await supabase
    .from('routine_schedule')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return (data as RoutineScheduleEntry[]) ?? []
}

export async function setRoutineForWeekday(params: {
  userId: string
  weekday: number
  routineId: string | null
}): Promise<void> {
  const { userId, weekday, routineId } = params
  if (routineId == null) {
    const { error } = await supabase
      .from('routine_schedule')
      .delete()
      .eq('user_id', userId)
      .eq('weekday', weekday)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('routine_schedule').upsert(
    {
      user_id: userId,
      weekday,
      routine_id: routineId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,weekday' },
  )
  if (error) throw error
}
