import { WeekRoutineSchedule } from '../WeekRoutineSchedule'
import { todayWeekday, WEEKDAY_LABELS } from '../../lib/routines'
import type { RoutineScheduleEntry, WorkoutRoutine } from '../../types/database'

export interface TrainHomeProps {
  userId?: string
  todayRoutine: WorkoutRoutine | null
  routines: WorkoutRoutine[]
  schedule: RoutineScheduleEntry[]
  routinesLoading: boolean
  error: string | null
  onScheduleChanged: () => void
  onStartEmpty: () => void
  onStartFromRoutine: (routineId: string) => void
  onToggleFavorite: (routine: WorkoutRoutine) => void
  onDeleteRoutine: (routine: WorkoutRoutine) => void
}

/**
 * Vista idle de Entrenar: CTA del día, calendario y lista de rutinas.
 * El estado y las operaciones viven en Train.
 */
export function TrainHome({
  userId,
  todayRoutine,
  routines,
  schedule,
  routinesLoading,
  error,
  onScheduleChanged,
  onStartEmpty,
  onStartFromRoutine,
  onToggleFavorite,
  onDeleteRoutine,
}: TrainHomeProps) {
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
            onClick={() => void onStartFromRoutine(todayRoutine.id)}
          >
            Empezar rutina de hoy
          </button>
          <button
            className="btn-secondary min-h-11 w-full"
            type="button"
            onClick={onStartEmpty}
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
            onClick={onStartEmpty}
          >
            Empezar sesión vacía
          </button>
        </div>
      )}

      {userId && (
        <WeekRoutineSchedule
          userId={userId}
          routines={routines}
          schedule={schedule}
          onChanged={onScheduleChanged}
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
              onClick={() => void onStartFromRoutine(routine.id)}
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
              onClick={() => void onToggleFavorite(routine)}
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
