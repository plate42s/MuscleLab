import { ExercisePicker } from '../ExercisePicker'
import { RestTimer, writeRestPref } from '../RestTimer'
import type { Exercise, WorkoutExerciseDraft } from '../../types/database'
import { ExerciseBlock } from './ExerciseBlock'
import type { SetRowField } from './SetRow'

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

export interface TrainSessionProps {
  userId?: string
  title: string
  notes: string
  items: WorkoutExerciseDraft[]
  sessionName: string
  elapsedMs: number
  showClock: boolean
  totalSets: number
  completedSets: number
  saving: boolean
  savingRoutine: boolean
  error: string | null
  message: string | null
  pickerOpen: boolean
  restEndsAt: number | null
  restSec: number
  restLabel?: string
  onTitleChange: (value: string) => void
  onNotesChange: (value: string) => void
  onToggleClock: () => void
  onCancel: () => void
  onSaveRoutine: () => void
  onChangeSet: (
    exerciseLocalId: string,
    setLocalId: string,
    field: SetRowField,
    value: string,
  ) => void
  onCompleteSet: (exerciseLocalId: string, setLocalId: string) => void
  onRemoveSet: (exerciseLocalId: string, setLocalId: string) => void
  onAddSet: (exerciseLocalId: string) => void
  onDuplicateSet: (exerciseLocalId: string) => void
  onRemoveExercise: (exerciseLocalId: string) => void
  onOpenPicker: () => void
  onClosePicker: () => void
  onSelectExercise: (exercise: Exercise) => void
  onSkipRest: () => void
  onChangeRestPreset: (sec: number) => void
  onFinish: () => void
}

/**
 * Vista de sesión activa. Estado y persistencia viven en Train.
 */
export function TrainSession({
  userId,
  title,
  notes,
  items,
  sessionName,
  elapsedMs,
  showClock,
  totalSets,
  completedSets,
  saving,
  savingRoutine,
  error,
  message,
  pickerOpen,
  restEndsAt,
  restSec,
  restLabel,
  onTitleChange,
  onNotesChange,
  onToggleClock,
  onCancel,
  onSaveRoutine,
  onChangeSet,
  onCompleteSet,
  onRemoveSet,
  onAddSet,
  onDuplicateSet,
  onRemoveExercise,
  onOpenPicker,
  onClosePicker,
  onSelectExercise,
  onSkipRest,
  onChangeRestPreset,
  onFinish,
}: TrainSessionProps) {
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
              onClick={onToggleClock}
            >
              {showClock ? 'Ocultar reloj' : 'Mostrar reloj'}
            </button>
            <button
              className="mt-1 text-xs font-semibold ml-muted underline"
              type="button"
              onClick={onCancel}
            >
              Cancelar
            </button>
          </div>
        </div>

        <input
          className="input-field min-h-11"
          placeholder="Nombre de la sesión / rutina"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <textarea
          className="input-field min-h-16 md:min-h-20"
          placeholder="Notas de la sesión"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />

        <button
          className="btn-secondary min-h-11 w-full"
          type="button"
          disabled={savingRoutine}
          onClick={onSaveRoutine}
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

      {items.map((item) => (
        <ExerciseBlock
          key={item.localId}
          item={item}
          onChangeSet={(setLocalId, field, value) =>
            onChangeSet(item.localId, setLocalId, field, value)
          }
          onCompleteSet={(setLocalId) => onCompleteSet(item.localId, setLocalId)}
          onRemoveSet={(setLocalId) => onRemoveSet(item.localId, setLocalId)}
          onAddSet={() => onAddSet(item.localId)}
          onDuplicateSet={() => onDuplicateSet(item.localId)}
          onRemoveExercise={() => onRemoveExercise(item.localId)}
        />
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="fixed inset-x-0 bottom-[4.75rem] z-10 px-3 md:static md:bottom-auto md:z-auto md:px-0">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {restEndsAt != null && (
            <RestTimer
              endsAt={restEndsAt}
              totalSec={restSec}
              label={restLabel}
              onSkip={onSkipRest}
              onChangePreset={(sec) => {
                writeRestPref(sec)
                onChangeRestPreset(sec)
              }}
            />
          )}
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--ml-border)] bg-[var(--ml-surface)]/95 p-2 shadow-lg backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
            <button
              className="btn-secondary min-h-11 w-full"
              type="button"
              onClick={onOpenPicker}
            >
              + Añadir ejercicio
            </button>
            <button
              className="btn-primary min-h-12 w-full text-base md:min-h-0 md:text-sm"
              type="button"
              disabled={saving}
              onClick={onFinish}
            >
              {saving ? 'Guardando…' : 'Terminar sesión'}
            </button>
          </div>
        </div>
      </div>

      {userId && (
        <ExercisePicker
          open={pickerOpen}
          userId={userId}
          onClose={onClosePicker}
          onSelect={onSelectExercise}
        />
      )}
    </div>
  )
}
