import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  createEmptySet,
  createExerciseDraft,
  duplicateLastSet,
  reindexSets,
} from '../lib/workoutDraft'
import type { Exercise, LoadType, WorkoutExerciseDraft, WorkoutSetDraft } from '../types/database'

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function setStatusLabel(set: WorkoutSetDraft, isActive: boolean) {
  if (set.completed) return 'Completada'
  if (isActive) return 'Activa'
  return 'Pendiente'
}

export function Train() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<WorkoutExerciseDraft[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || startedAt == null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active, startedAt])

  const elapsedMs = startedAt != null ? now - startedAt : 0
  const sessionName = title.trim() || 'Sesión activa'

  const totalSets = useMemo(
    () => items.reduce((acc, item) => acc + item.sets.length, 0),
    [items],
  )
  const completedSets = useMemo(
    () => items.reduce((acc, item) => acc + item.sets.filter((s) => s.completed).length, 0),
    [items],
  )

  function startSession() {
    setActive(true)
    setStartedAt(Date.now())
    setNow(Date.now())
    setTitle('')
    setNotes('')
    setItems([])
    setError(null)
  }

  function cancelSession() {
    setActive(false)
    setStartedAt(null)
    setItems([])
    setTitle('')
    setNotes('')
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

  /** Híbrido B+C: completa la serie y avanza / crea la siguiente */
  function completeSet(exerciseLocalId: string, setLocalId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.localId !== exerciseLocalId) return item
        const idx = item.sets.findIndex((s) => s.localId === setLocalId)
        if (idx < 0) return item

        let sets = item.sets.map((set, i) =>
          i === idx ? { ...set, completed: true } : set,
        )

        const hasNextIncomplete = sets.slice(idx + 1).some((s) => !s.completed)
        if (!hasNextIncomplete) {
          sets = [...sets, createEmptySet(sets.length + 1)]
        }

        return { ...item, sets: reindexSets(sets) }
      }),
    )
  }

  function removeSet(exerciseLocalId: string, setLocalId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.localId !== exerciseLocalId) return item
        const next = item.sets.filter((s) => s.localId !== setLocalId)
        if (next.length === 0) {
          return { ...item, sets: [createEmptySet(1)] }
        }
        return { ...item, sets: reindexSets(next) }
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

    const setsToSave = items.flatMap((item) =>
      item.sets.filter((set) => {
        if (set.completed) return true
        // Incluye series con datos aunque no estén marcadas
        return Boolean(set.reps || set.weight_kg || set.duration_sec || set.rpe)
      }),
    )
    if (setsToSave.length === 0) {
      setError('Completa al menos una serie')
      return
    }

    setSaving(true)
    setError(null)

    const durationMin = Math.max(1, Math.round(elapsedMs / 60000))

    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        title: title.trim() || `Sesión ${new Date().toLocaleDateString('es-MX')}`,
        notes: notes.trim() || null,
        performed_at: new Date().toISOString(),
        duration_min: durationMin,
      })
      .select('*')
      .single()

    if (workoutError || !workout) {
      setSaving(false)
      setError(workoutError?.message ?? 'No se pudo crear la sesión')
      return
    }

    const rows = items.flatMap((item) => {
      const kept = item.sets.filter((set) => {
        if (set.completed) return true
        return Boolean(set.reps || set.weight_kg || set.duration_sec || set.rpe)
      })
      return kept.map((set, index) => ({
        workout_id: workout.id,
        exercise_id: item.exercise.id,
        set_index: index + 1,
        reps: set.reps ? Number(set.reps) : null,
        weight_kg: set.weight_kg ? Number(set.weight_kg) : null,
        duration_sec: set.duration_sec ? Number(set.duration_sec) : null,
        rpe: set.rpe ? Number(set.rpe) : null,
      }))
    })

    if (rows.length === 0) {
      await supabase.from('workouts').delete().eq('id', workout.id)
      setSaving(false)
      setError('Completa al menos una serie')
      return
    }

    const { error: setsError } = await supabase.from('workout_sets').insert(rows)
    setSaving(false)

    if (setsError) {
      await supabase.from('workouts').delete().eq('id', workout.id)
      setError(setsError.message)
      return
    }

    cancelSession()
    navigate(`/progreso/${workout.id}`)
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-xl space-y-3 md:space-y-4">
        <h2 className="hidden font-display text-2xl font-bold ml-title md:block">Entrenar</h2>
        <div className="card space-y-3">
          <h2 className="text-xl font-bold ml-title md:hidden">Empezar sesión</h2>
          <p className="text-sm ml-muted">
            Registra series en el móvil. Calistenia (reps/tiempo) y gym (reps + peso).
          </p>
          <button
            className="btn-primary min-h-12 w-full text-base md:min-h-0 md:text-sm"
            type="button"
            onClick={startSession}
          >
            Empezar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-3 pb-28 md:space-y-4 md:pb-4">
      {/* Header sesión + duración */}
      <div className="ml-stat-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
              Sesión en curso
            </p>
            <h2 className="truncate font-display text-xl font-bold ml-title md:text-2xl">
              {sessionName}
            </h2>
            <p className="mt-1 text-sm ml-muted">
              {items.length} ejercicios · {completedSets}/{totalSets} series
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="font-display text-2xl font-bold tabular-nums"
              style={{ color: 'var(--ml-primary)' }}
            >
              {formatElapsed(elapsedMs)}
            </p>
            <button
              className="mt-1 text-xs font-semibold ml-muted underline"
              type="button"
              onClick={cancelSession}
            >
              Cancelar
            </button>
          </div>
        </div>

        <input
          className="input-field min-h-11"
          placeholder="Nombre de la sesión (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input-field min-h-16 md:min-h-20"
          placeholder="Notas de la sesión"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {items.map((item) => {
        const activeSetId =
          item.sets.find((s) => !s.completed)?.localId ?? item.sets[item.sets.length - 1]?.localId

        return (
          <div key={item.localId} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold ml-title">{item.exercise.name}</h3>
                <p className="text-xs ml-muted">
                  {item.exercise.modality} · {item.exercise.load_type}
                </p>
              </div>
              <button
                className="text-xs font-semibold text-danger"
                type="button"
                onClick={() => removeExercise(item.localId)}
              >
                Quitar
              </button>
            </div>

            {/* Cabecera de filas */}
            <div
              className="hidden grid-cols-[2.5rem_1fr_1fr_3.5rem_auto] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] ml-muted sm:grid"
            >
              <span>Serie</span>
              <span>{item.exercise.load_type === 'time' ? 'Seg' : 'Reps'}</span>
              <span>
                {item.exercise.load_type === 'reps_weight'
                  ? 'Kg'
                  : item.exercise.load_type === 'time'
                    ? '—'
                    : 'RPE'}
              </span>
              <span>RPE</span>
              <span>Estado</span>
            </div>

            <div className="space-y-2">
              {item.sets.map((set) => {
                const isActive = set.localId === activeSetId && !set.completed
                return (
                  <SetRow
                    key={set.localId}
                    set={set}
                    loadType={item.exercise.load_type}
                    isActive={isActive}
                    onChange={(field, value) =>
                      updateSet(item.localId, set.localId, field, value)
                    }
                    onComplete={() => completeSet(item.localId, set.localId)}
                    onRemove={() => removeSet(item.localId, set.localId)}
                  />
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn-secondary min-h-11 !py-2"
                type="button"
                onClick={() => addSet(item.localId)}
              >
                + Serie
              </button>
              <button
                className="btn-secondary min-h-11 !py-2"
                type="button"
                onClick={() => duplicateSet(item.localId)}
              >
                Duplicar última
              </button>
            </div>
          </div>
        )
      })}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="fixed inset-x-0 bottom-[4.75rem] z-10 px-3 md:static md:bottom-auto md:z-auto md:px-0">
        <div className="mx-auto flex max-w-xl flex-col gap-2 rounded-2xl border border-[var(--ml-border)] bg-[var(--ml-surface)]/95 p-2 shadow-lg backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          <button
            className="btn-secondary min-h-11 w-full"
            type="button"
            onClick={() => setPickerOpen(true)}
          >
            + Añadir ejercicio
          </button>
          <button
            className="btn-primary min-h-12 w-full text-base md:min-h-0 md:text-sm"
            type="button"
            disabled={saving}
            onClick={() => void finishSession()}
          >
            {saving ? 'Guardando…' : 'Terminar sesión'}
          </button>
        </div>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />
    </div>
  )
}

function SetRow({
  set,
  loadType,
  isActive,
  onChange,
  onComplete,
  onRemove,
}: {
  set: WorkoutSetDraft
  loadType: LoadType
  isActive: boolean
  onChange: (field: 'reps' | 'weight_kg' | 'duration_sec' | 'rpe', value: string) => void
  onComplete: () => void
  onRemove: () => void
}) {
  const status = setStatusLabel(set, isActive)
  const borderStyle = set.completed
    ? { borderColor: 'var(--ml-success)' }
    : isActive
      ? { borderColor: 'var(--ml-primary)' }
      : undefined

  return (
    <div
      className="rounded-xl border border-[var(--ml-border)] bg-[var(--ml-surface)] p-3"
      style={borderStyle}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] ml-muted">
          Serie {set.set_index}
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={
            set.completed
              ? { background: 'rgba(53,184,121,0.18)', color: 'var(--ml-success)' }
              : isActive
                ? { background: 'rgba(240,120,53,0.18)', color: 'var(--ml-primary)' }
                : { background: 'var(--ml-elevated)', color: 'var(--ml-text-muted)' }
          }
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(loadType === 'reps' || loadType === 'reps_weight') && (
          <label className="text-xs">
            <span className="mb-1 block font-medium ml-muted">Reps</span>
            <input
              className="input-field min-h-11 text-base"
              inputMode="numeric"
              disabled={set.completed}
              value={set.reps}
              onChange={(e) => onChange('reps', e.target.value)}
            />
          </label>
        )}
        {loadType === 'reps_weight' && (
          <label className="text-xs">
            <span className="mb-1 block font-medium ml-muted">Kg</span>
            <input
              className="input-field min-h-11 text-base"
              inputMode="decimal"
              disabled={set.completed}
              value={set.weight_kg}
              onChange={(e) => onChange('weight_kg', e.target.value)}
            />
          </label>
        )}
        {loadType === 'time' && (
          <label className="text-xs">
            <span className="mb-1 block font-medium ml-muted">Segundos</span>
            <input
              className="input-field min-h-11 text-base"
              inputMode="numeric"
              disabled={set.completed}
              value={set.duration_sec}
              onChange={(e) => onChange('duration_sec', e.target.value)}
            />
          </label>
        )}
        <label className="text-xs">
          <span className="mb-1 block font-medium ml-muted">RPE</span>
          <input
            className="input-field min-h-11 text-base"
            inputMode="decimal"
            placeholder="1-10"
            disabled={set.completed}
            value={set.rpe}
            onChange={(e) => onChange('rpe', e.target.value)}
          />
        </label>
      </div>

      <div className="mt-2 flex gap-2">
        {!set.completed && (
          <button
            className="btn-primary min-h-10 flex-1 !py-2 text-xs"
            type="button"
            onClick={onComplete}
          >
            Completar
          </button>
        )}
        <button
          className="btn-secondary min-h-10 !px-3 !py-2 text-xs"
          type="button"
          onClick={onRemove}
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}
