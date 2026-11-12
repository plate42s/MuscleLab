export type Goal = 'fuerza' | 'skills' | 'estetica' | 'mixto'
export type Level = 'principiante' | 'intermedio' | 'avanzado'
export type Modality = 'calistenia' | 'gym' | 'mixto'
export type ExerciseModality = 'calistenia' | 'gym' | 'core' | 'cardio'
export type LoadType = 'reps' | 'reps_weight' | 'time'
export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  display_name: string | null
  username: string | null
  role: UserRole
  goal: Goal | null
  level: Level | null
  modality: Modality | null
  weight_kg: number | null
  daily_kcal_target: number | null
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  name: string
  modality: ExerciseModality
  muscle_group: string
  load_type: LoadType
  is_active: boolean
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  performed_at: string
  title: string | null
  notes: string | null
  duration_min: number | null
  created_at: string
}

export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: string
  set_index: number
  reps: number | null
  weight_kg: number | null
  duration_sec: number | null
  rpe: number | null
  notes: string | null
}

export interface WorkoutSetDraft {
  localId: string
  set_index: number
  reps: string
  weight_kg: string
  duration_sec: string
  rpe: string
}

export interface WorkoutExerciseDraft {
  localId: string
  exercise: Exercise
  sets: WorkoutSetDraft[]
}

export interface WorkoutListItem extends Workout {
  set_count: number
  exercise_count: number
}

export interface BodyMetric {
  id: string
  user_id: string
  recorded_at: string
  weight_kg: number | null
  waist_cm: number | null
  chest_cm: number | null
  arm_cm: number | null
  notes: string | null
  created_at: string
}

export interface FoodLog {
  id: string
  user_id: string
  eaten_at: string
  name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
  created_at: string
}
