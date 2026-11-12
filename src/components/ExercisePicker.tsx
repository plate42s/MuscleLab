import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Exercise, ExerciseModality } from '../types/database'

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

const modalities: Array<ExerciseModality | 'todas'> = ['todas', 'calistenia', 'gym', 'core', 'cardio']

export function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [modality, setModality] = useState<ExerciseModality | 'todas'>('todas')
  const [muscleGroup, setMuscleGroup] = useState('todas')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        setLoading(false)
        if (fetchError) {
          setError(fetchError.message)
          return
        }
        setExercises((data as Exercise[]) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const muscleGroups = useMemo(() => {
    const set = new Set(exercises.map((e) => e.muscle_group))
    return ['todas', ...Array.from(set).sort()]
  }, [exercises])

  const filtered = useMemo(() => {
    return exercises.filter((exercise) => {
      if (modality !== 'todas' && exercise.modality !== modality) return false
      if (muscleGroup !== 'todas' && exercise.muscle_group !== muscleGroup) return false
      if (query.trim() && !exercise.name.toLowerCase().includes(query.trim().toLowerCase())) {
        return false
      }
      return true
    })
  }, [exercises, modality, muscleGroup, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-4 shadow-xl md:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Añadir ejercicio</h2>
          <button className="btn-secondary !px-3 !py-2" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <input
          className="input-field mb-3"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {modalities.map((item) => (
            <button
              key={item}
              type="button"
              className={[
                'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold',
                modality === item
                  ? 'bg-crimson text-cream-mist'
                  : 'bg-cream-oat text-ink-700',
              ].join(' ')}
              onClick={() => setModality(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <select
          className="input-field mb-3"
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
        >
          {muscleGroups.map((group) => (
            <option key={group} value={group}>
              {group === 'todas' ? 'Todos los grupos' : group}
            </option>
          ))}
        </select>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading && <p className="text-sm ml-muted">Cargando catálogo…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm ml-muted">No hay ejercicios con esos filtros.</p>
          )}
          {filtered.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-cream-oat px-3 py-3 text-left hover:bg-gold-soft/50"
              onClick={() => {
                onSelect(exercise)
                onClose()
              }}
            >
              <span>
                <span className="block text-sm font-semibold">{exercise.name}</span>
                <span className="text-xs ml-muted">
                  {exercise.modality} · {exercise.muscle_group} · {exercise.load_type}
                </span>
              </span>
              <span className="text-accent-dark">+</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
