import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readRestPref, writeRestPref } from '../components/RestTimer'
import { TrainHome } from '../components/train/TrainHome'
import { TrainSession } from '../components/train/TrainSession'
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
      startSession(routineToDrafts(routine))
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
      <TrainHome
        userId={user?.id}
        todayRoutine={todayRoutine}
        routines={routines}
        schedule={schedule}
        routinesLoading={routinesLoading}
        error={error}
        onScheduleChanged={() => void refreshRoutines()}
        onStartEmpty={() => startSession()}
        onStartFromRoutine={(routineId) => void startFromRoutine(routineId)}
        onToggleFavorite={(routine) => void onToggleRoutineFavorite(routine)}
        onDeleteRoutine={(routine) => void onDeleteRoutine(routine)}
      />
    )
  }

  return (
    <TrainSession
      userId={user?.id}
      title={title}
      notes={notes}
      items={items}
      sessionName={sessionName}
      elapsedMs={elapsedMs}
      showClock={showClock}
      totalSets={totalSets}
      completedSets={completedSets}
      saving={saving}
      savingRoutine={savingRoutine}
      error={error}
      message={message}
      pickerOpen={pickerOpen}
      restEndsAt={restEndsAt}
      restSec={restSec}
      restLabel={restLabel}
      onTitleChange={setTitle}
      onNotesChange={setNotes}
      onToggleClock={() => setShowClock((v) => !v)}
      onCancel={cancelSession}
      onSaveRoutine={() => void onSaveRoutine()}
      onChangeSet={updateSet}
      onCompleteSet={completeSet}
      onRemoveSet={removeSet}
      onAddSet={addSet}
      onDuplicateSet={duplicateSet}
      onRemoveExercise={removeExercise}
      onOpenPicker={() => setPickerOpen(true)}
      onClosePicker={() => setPickerOpen(false)}
      onSelectExercise={addExercise}
      onSkipRest={skipRest}
      onChangeRestPreset={(sec) => {
        setRestSec(sec)
        setRestEndsAt(Date.now() + sec * 1000)
      }}
      onFinish={() => void finishSession()}
    />
  )
}
