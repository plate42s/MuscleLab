import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { readRestPref, RestTimer, writeRestPref } from '../components/RestTimer'
import { SetRow } from '../components/train/SetRow'
import { WeekRoutineSchedule } from '../components/WeekRoutineSchedule'
import { useAuth } from '../context/AuthContext'
import {
  deleteRoutine,
  listRoutineSchedule,
  listRoutines,
  loadRoutineWithItems,
  routineToDrafts,
  saveRoutineFromSession,
  todayWeekday,
  toggleRoutineFavorite,
  WEEKDAY_LABELS,
} from '../lib/routines'
import { saveWorkout, validateWorkoutForSave } from '../lib/saveWorkout'
import {
  createEmptySet,
  createExerciseDraft,
  duplicateLastSet,
  reindexSets,
} from '../lib/workoutDraft'
import type {
  Exercise,
  WorkoutExerciseDraft,
  RoutineScheduleEntry,
  WorkoutRoutine,
} from '../types/database'

const CLOCK_KEY = 'ml.train.showClock'

function readShowClock() {
  try {
    const v = localStorage.getItem(CLOCK_KEY)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
  }
}

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
  const [savingRoutine, setSavingRoutine] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showClock, setShowClock] = useState(() => readShowClock())
  const [restSec, setRestSec] = useState(() => readRestPref())
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [restLabel, setRestLabel] = useState<string | undefined>(undefined)
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [schedule, setSchedule] = useState<RoutineScheduleEntry[]>([])
  const [routinesLoading, setRoutinesLoading] = useState(false)
  const refreshRoutines = useCallback(async () => {
    if (!user) return
    setRoutinesLoading(true)
    try {
      const rows = await listRoutines(user.id)
      setRoutines(rows)
      try {
        const days = await listRoutineSchedule(user.id)
        setSchedule(days)
      } catch {
        setSchedule([])
      }
    } catch (err) {
      // Tabla aún no migrada: no bloqueamos empezar sesión vacía
      setRoutines([])
      setSchedule([])
      if (err instanceof Error && !err.message.includes('workout_routines')) {
        setError(err.message)
      }
    } finally {
      setRoutinesLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshRoutines()
  }, [refreshRoutines])

  const todayRoutine = useMemo(() => {
    const day = todayWeekday()
    const entry = schedule.find((s) => s.weekday === day)
    if (!entry?.routine_id) return null
    return routines.find((r) => r.id === entry.routine_id) ?? null
  }, [schedule, routines])

  useEffect(() => {
    if (!active || startedAt == null || !showClock) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active, startedAt, showClock])

  useEffect(() => {
    try {
      localStorage.setItem(CLOCK_KEY, showClock ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [showClock])

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

  function startSession(prefill?: {
    title?: string
    notes?: string
    items?: WorkoutExerciseDraft[]
  }) {
    setActive(true)
    setStartedAt(Date.now())
    setNow(Date.now())
    setTitle(prefill?.title ?? '')
    setNotes(prefill?.notes ?? '')
    setItems(prefill?.items ?? [])
    setError(null)
    setMessage(null)
  }

  function cancelSession() {
    setActive(false)
    setStartedAt(null)
    setItems([])
    setTitle('')
    setNotes('')
    setError(null)
    setMessage(null)
    setRestEndsAt(null)
    setRestLabel(undefined)
  }

  function startRest(label?: string, sec = restSec) {
    const duration = Math.max(1, sec)
    setRestSec(duration)
    writeRestPref(duration)
    setRestLabel(label)
    setRestEndsAt(Date.now() + duration * 1000)
  }

  function skipRest() {
    setRestEndsAt(null)
    setRestLabel(undefined)
  }

  async function startFromRoutine(routineId: string) {
    setError(null)
    try {
      const routine = await loadRoutineWithItems(routineId)
      if (!routine) {
        setError('No se encontró la rutina')
        return
      }
      const draft = routineToDrafts(routine)
      startSession(draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la rutina')
    }
  }

  async function onSaveRoutine() {
    if (!user) return
    const name = title.trim() || `Rutina ${new Date().toLocaleDateString('es-MX')}`
    if (items.length === 0) {
      setError('Añade ejercicios antes de guardar la rutina')
      return
    }
    setSavingRoutine(true)
    setError(null)
    setMessage(null)
    try {
      const result = await saveRoutineFromSession({
        userId: user.id,
        name,
        notes,
        items,
      })
      setMessage(
        result.updated
          ? `Rutina «${name}» actualizada (sin duplicar)`
          : `Rutina «${name}» guardada`,
      )
      await refreshRoutines()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes('workout_routines')
            ? 'Falta migración 008. Ejecuta supabase/migrations/008_favorites_routines.sql'
            : err.message
          : 'No se pudo guardar la rutina',
      )
    } finally {
      setSavingRoutine(false)
    }
  }

  async function onToggleRoutineFavorite(routine: WorkoutRoutine) {
    try {
      await toggleRoutineFavorite(routine.id, routine.is_favorite)
      await refreshRoutines()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar favorita')
    }
  }

  async function onDeleteRoutine(routine: WorkoutRoutine) {
    if (!confirm(`¿Eliminar la rutina «${routine.name}»?`)) return
    setError(null)
    try {
      await deleteRoutine(routine.id)
      await refreshRoutines()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la rutina')
    }
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

  /** Completa la serie y arranca descanso; la siguiente serie se añade con «+ Serie» */
  function completeSet(exerciseLocalId: string, setLocalId: string) {
    const exercise = items.find((i) => i.localId === exerciseLocalId)
    setItems((prev) =>
      prev.map((item) => {
        if (item.localId !== exerciseLocalId) return item
        return {
          ...item,
          sets: item.sets.map((set) =>
            set.localId === setLocalId ? { ...set, completed: true } : set,
          ),
        }
      }),
    )
    startRest(exercise?.exercise.name)
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

    const validationError = validateWorkoutForSave(items)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    const result = await saveWorkout({
      userId: user.id,
      title,
      notes,
      items,
      elapsedMs,
    })

    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    cancelSession()
    navigate(`/progreso/${result.workoutId}`)
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-xl space-y-3 md:space-y-4">
        <h2 className="hidden font-display text-2xl font-bold ml-title md:block">Entrenar</h2>

        {todayRoutine ? (
          <div className="card space-y-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--ml-primary)' }}
            >
              Hoy · {WEEKDAY_LABELS[todayWeekday()]}
            </p>
            <h2 className="text-xl font-bold ml-title">Rutina del día: {todayRoutine.name}</h2>
            <p className="text-sm ml-muted">
              {todayRoutine.notes?.trim() || 'Precargada con ejercicios y series de tu plantilla.'}
            </p>
            <button
              className="btn-primary min-h-12 w-full text-base md:min-h-0 md:text-sm"
              type="button"
              onClick={() => void startFromRoutine(todayRoutine.id)}
            >
              Empezar rutina de hoy
            </button>
            <button
              className="btn-secondary min-h-11 w-full"
              type="button"
              onClick={() => startSession()}
            >
              Empezar sesión vacía
            </button>
          </div>
        ) : (
          <div className="card space-y-3">
            <h2 className="text-xl font-bold ml-title md:hidden">Empezar sesión</h2>
            <p className="text-sm ml-muted">
              No hay rutina asignada a hoy. Elige en el calendario o empieza vacío.
            </p>
            <button
              className="btn-primary min-h-12 w-full text-base md:min-h-0 md:text-sm"
              type="button"
              onClick={() => startSession()}
            >
              Empezar sesión vacía
            </button>
          </div>
        )}

        {user && (
          <WeekRoutineSchedule
            userId={user.id}
            routines={routines}
            schedule={schedule}
            onChanged={refreshRoutines}
          />
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold ml-title">Mis rutinas</h3>
            {routinesLoading && <span className="text-xs ml-muted">Cargando…</span>}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {!routinesLoading && routines.length === 0 && (
            <div className="ml-stat-card">
              <p className="text-sm ml-muted">
                Aún no hay rutinas. En una sesión usa «Guardar rutina».
              </p>
            </div>
          )}
          {routines.map((routine) => (
            <div key={routine.id} className="ml-stat-card flex items-center gap-2">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => void startFromRoutine(routine.id)}
              >
                <p className="font-semibold ml-title">
                  {routine.is_favorite ? '★ ' : ''}
                  {routine.name}
                </p>
                <p className="text-xs ml-muted">
                  {routine.notes?.trim() || 'Toca para cargar y continuar'}
                </p>
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-2 text-lg"
                style={{
                  color: routine.is_favorite ? 'var(--ml-primary)' : 'var(--ml-text-muted)',
                }}
                aria-label="Marcar rutina favorita"
                onClick={() => void onToggleRoutineFavorite(routine)}
              >
                {routine.is_favorite ? '★' : '☆'}
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold"
                style={{ color: 'var(--ml-danger)' }}
                aria-label="Eliminar rutina"
                onClick={() => void onDeleteRoutine(routine)}
              >
                Eliminar
              </button>
            </div>
          ))}
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
            {showClock ? (
              <p
                className="font-display text-2xl font-bold tabular-nums"
                style={{ color: 'var(--ml-primary)' }}
              >
                {formatElapsed(elapsedMs)}
              </p>
            ) : (
              <p className="text-xs font-semibold ml-muted">Reloj oculto</p>
            )}
            <button
              className="mt-1 block w-full text-xs font-semibold ml-muted underline"
              type="button"
              onClick={() => setShowClock((v) => !v)}
            >
              {showClock ? 'Ocultar reloj' : 'Mostrar reloj'}
            </button>
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
          placeholder="Nombre de la sesión / rutina"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input-field min-h-16 md:min-h-20"
          placeholder="Notas de la sesión"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button
          className="btn-secondary min-h-11 w-full"
          type="button"
          disabled={savingRoutine}
          onClick={() => void onSaveRoutine()}
        >
          {savingRoutine ? 'Guardando rutina…' : 'Guardar rutina'}
        </button>
        <p className="text-xs ml-muted">
          Si el nombre ya existe, se actualiza. Marca ★ en «Mis rutinas» para favoritas.
        </p>
        {message && (
          <p className="text-sm" style={{ color: 'var(--ml-success)' }}>
            {message}
          </p>
        )}
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
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {restEndsAt != null && (
            <RestTimer
              endsAt={restEndsAt}
              totalSec={restSec}
              label={restLabel}
              onSkip={skipRest}
              onChangePreset={(sec) => {
                writeRestPref(sec)
                setRestSec(sec)
                setRestEndsAt(Date.now() + sec * 1000)
              }}
            />
          )}
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--ml-border)] bg-[var(--ml-surface)]/95 p-2 shadow-lg backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
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
      </div>

      {user && (
        <ExercisePicker
          open={pickerOpen}
          userId={user.id}
          onClose={() => setPickerOpen(false)}
          onSelect={addExercise}
        />
      )}
    </div>
  )
}
