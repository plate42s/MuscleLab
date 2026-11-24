import type { WorkoutExerciseDraft } from '../../types/database'
import { SetRow, type SetRowField } from './SetRow'

export interface ExerciseBlockProps {
  item: WorkoutExerciseDraft
  onChangeSet: (setLocalId: string, field: SetRowField, value: string) => void
  onCompleteSet: (setLocalId: string) => void
  onRemoveSet: (setLocalId: string) => void
  onAddSet: () => void
  onDuplicateSet: () => void
  onRemoveExercise: () => void
}

/**
 * Presentación de un ejercicio y sus series.
 * El estado de `items` permanece en Train; aquí solo UI + callbacks.
 */
export function ExerciseBlock({
  item,
  onChangeSet,
  onCompleteSet,
  onRemoveSet,
  onAddSet,
  onDuplicateSet,
  onRemoveExercise,
}: ExerciseBlockProps) {
  const activeSetId =
    item.sets.find((s) => !s.completed)?.localId ?? item.sets[item.sets.length - 1]?.localId

  return (
    <div className="card space-y-3">
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
          onClick={onRemoveExercise}
        >
          Quitar
        </button>
      </div>

      {/* Cabecera de filas */}
      <div className="hidden grid-cols-[2.5rem_1fr_1fr_3.5rem_auto] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] ml-muted sm:grid">
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
              onChange={(field, value) => onChangeSet(set.localId, field, value)}
              onComplete={() => onCompleteSet(set.localId)}
              onRemove={() => onRemoveSet(set.localId)}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn-secondary min-h-11 !py-2"
          type="button"
          onClick={onAddSet}
        >
          + Serie
        </button>
        <button
          className="btn-secondary min-h-11 !py-2"
          type="button"
          onClick={onDuplicateSet}
        >
          Duplicar última
        </button>
      </div>
    </div>
  )
}
