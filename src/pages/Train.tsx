import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { createEmptySet, createExerciseDraft, duplicateLastSet } from '../lib/workoutDraft'
import type { Exercise, WorkoutExerciseDraft } from '../types/database'

export function Train() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<WorkoutExerciseDraft[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSets = useMemo(
    () => items.reduce((acc, item) => acc + item.sets.length, 0),
    [items],
  )

  function startSession() {
    setActive(true)
    setTitle('')
    setNotes('')
    setItems([])
    setError(null)
  }

  function addExercise(exercise: Exercise) {
    setItems((prev) => [...prev, createExerciseDraft(exercise)])
  }

  function updateSet(
    exerciseLocalId: string,
    setLocalId: string,
    field: 'reps' | 'weight_kg' | 'duration_sec' | 'rpe',
    value: string,
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.localId !== exerciseLocalId) return item
        return {
          ...item,
          sets: item.sets.map((set) =>
            set.localId === setLocalId ? { ...set, [field]: value } : set,
          ),
        }
      }),
    )
  }

  function addSet(exerciseLocalId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.localId !== exerciseLocalId) return item
        return {
          ...item,
          sets: [...item.sets, createEmptySet(item.sets.length + 1)],
        }
      }),
    )
  }

  function duplicateSet(exerciseLocalId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.localId !== exerciseLocalId) return item
        return { ...item, sets: duplicateLastSet(item.sets) }
      }),
    )
  }

  function removeExercise(exerciseLocalId: string) {
    setItems((prev) => prev.filter((item) => item.localId !== exerciseLocalId))
  }

  async function finishSession() {
    if (!user) return
    if (items.length === 0) {
      setError('Añade al menos un ejercicio')
      return
    }

    setSaving(true)
    setError(null)

    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        title: title.trim() || `Sesión ${new Date().toLocaleDateString('es-MX')}`,
        notes: notes.trim() || null,
        performed_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (workoutError || !workout) {
      setSaving(false)
      setError(workoutError?.message ?? 'No se pudo crear la sesión')
      return
    }

    const rows = items.flatMap((item) =>
      item.sets.map((set, index) => ({
        workout_id: workout.id,
        exercise_id: item.exercise.id,
        set_index: index + 1,
        reps: set.reps ? Number(set.reps) : null,
        weight_kg: set.weight_kg ? Number(set.weight_kg) : null,
        duration_sec: set.duration_sec ? Number(set.duration_sec) : null,
        rpe: set.rpe ? Number(set.rpe) : null,
      })),
    )

    const { error: setsError } = await supabase.from('workout_sets').insert(rows)
    setSaving(false)

    if (setsError) {
      await supabase.from('workouts').delete().eq('id', workout.id)
      setError(setsError.message)
      return
    }

    setActive(false)
    setItems([])
    navigate(`/progreso/${workout.id}`)
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="font-display text-2xl font-bold ml-title">Entrenar</h1>
        <div className="card space-y-3">
          <p className="text-sm ml-muted">
            Registra series en el móvil. Calistenia (reps/tiempo) y gym (reps + peso).
          </p>
          <button className="btn-primary w-full" type="button" onClick={startSession}>
            Empezar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold ml-title">Sesión activa</h1>
          <p className="text-sm ml-muted">
            {items.length} ejercicios · {totalSets} series
          </p>
        </div>
        <button
          className="btn-secondary !px-3 !py-2 text-xs"
          type="button"
          onClick={() => {
            setActive(false)
            setItems([])
          }}
        >
          Cancelar
        </button>
      </div>

      <div className="card space-y-3">
        <input
          className="input-field"
          placeholder="Título (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input-field min-h-20"
          placeholder="Notas de la sesión"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {items.map((item) => (
        <div key={item.localId} className="card space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">{item.exercise.name}</h2>
              <p className="text-xs ml-muted">
                {item.exercise.modality} · {item.exercise.load_type}
              </p>
            </div>
            <button
              className="text-xs font-semibold text-red-600"
              type="button"
              onClick={() => removeExercise(item.localId)}
            >
              Quitar
            </button>
          </div>

          <div className="space-y-2">
            {item.sets.map((set) => (
              <div key={set.localId} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(item.exercise.load_type === 'reps' ||
                  item.exercise.load_type === 'reps_weight') && (
                  <label className="text-xs">
                    <span className="mb-1 block ml-muted">Reps</span>
                    <input
                      className="input-field"
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(e) => updateSet(item.localId, set.localId, 'reps', e.target.value)}
                    />
                  </label>
                )}
                {item.exercise.load_type === 'reps_weight' && (
                  <label className="text-xs">
                    <span className="mb-1 block ml-muted">Peso kg</span>
                    <input
                      className="input-field"
                      inputMode="decimal"
                      value={set.weight_kg}
                      onChange={(e) =>
                        updateSet(item.localId, set.localId, 'weight_kg', e.target.value)
                      }
                    />
                  </label>
                )}
                {item.exercise.load_type === 'time' && (
                  <label className="text-xs">
                    <span className="mb-1 block ml-muted">Segundos</span>
                    <input
                      className="input-field"
                      inputMode="numeric"
                      value={set.duration_sec}
                      onChange={(e) =>
                        updateSet(item.localId, set.localId, 'duration_sec', e.target.value)
                      }
                    />
                  </label>
                )}
                <label className="text-xs">
                  <span className="mb-1 block ml-muted">RPE</span>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    placeholder="1-10"
                    value={set.rpe}
                    onChange={(e) => updateSet(item.localId, set.localId, 'rpe', e.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1 !py-2" type="button" onClick={() => addSet(item.localId)}>
              + Serie
            </button>
            <button
              className="btn-secondary flex-1 !py-2"
              type="button"
              onClick={() => duplicateSet(item.localId)}
            >
              Duplicar última
            </button>
          </div>
        </div>
      ))}

      <button className="btn-secondary w-full" type="button" onClick={() => setPickerOpen(true)}>
        + Añadir ejercicio
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="btn-primary w-full" type="button" disabled={saving} onClick={() => void finishSession()}>
        {saving ? 'Guardando…' : 'Terminar sesión'}
      </button>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />
    </div>
  )
}
