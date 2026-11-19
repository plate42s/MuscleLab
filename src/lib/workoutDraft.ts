import type { Exercise, WorkoutExerciseDraft, WorkoutSetDraft } from '../types/database'

function uid() {
  return crypto.randomUUID()
}

export function createEmptySet(index: number): WorkoutSetDraft {
  return {
    localId: uid(),
    set_index: index,
    reps: '',
    weight_kg: '',
    duration_sec: '',
    rpe: '',
    completed: false,
  }
}

export function createExerciseDraft(exercise: Exercise): WorkoutExerciseDraft {
  return {
    localId: uid(),
    exercise,
    sets: [createEmptySet(1)],
  }
}

export function duplicateLastSet(sets: WorkoutSetDraft[]): WorkoutSetDraft[] {
  const last = sets[sets.length - 1]
  if (!last) return [createEmptySet(1)]
  return [
    ...sets,
    {
      ...last,
      localId: uid(),
      set_index: sets.length + 1,
      completed: false,
    },
  ]
}

export function reindexSets(sets: WorkoutSetDraft[]): WorkoutSetDraft[] {
  return sets.map((set, index) => ({ ...set, set_index: index + 1 }))
}
