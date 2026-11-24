import type { LoadType, WorkoutSetDraft } from '../../types/database'

export type SetRowField = 'reps' | 'weight_kg' | 'duration_sec' | 'rpe'

export interface SetRowProps {
  set: WorkoutSetDraft
  loadType: LoadType
  isActive: boolean
  onChange: (field: SetRowField, value: string) => void
  onComplete: () => void
  onRemove: () => void
}

function setStatusLabel(set: WorkoutSetDraft, isActive: boolean) {
  if (set.completed) return 'Completada'
  if (isActive) return 'Activa'
  return 'Pendiente'
}

export function SetRow({
  set,
  loadType,
  isActive,
  onChange,
  onComplete,
  onRemove,
}: SetRowProps) {
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
