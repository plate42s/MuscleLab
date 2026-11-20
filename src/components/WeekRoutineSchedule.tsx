import { useMemo, useState } from 'react'
import {
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  setRoutineForWeekday,
  todayWeekday,
} from '../lib/routines'
import type { RoutineScheduleEntry, WorkoutRoutine } from '../types/database'

export function WeekRoutineSchedule({
  userId,
  routines,
  schedule,
  onChanged,
}: {
  userId: string
  routines: WorkoutRoutine[]
  schedule: RoutineScheduleEntry[]
  onChanged: () => Promise<void> | void
}) {
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = todayWeekday()

  const byDay = useMemo(() => {
    const map = new Map<number, string | null>()
    for (const row of schedule) {
      map.set(row.weekday, row.routine_id)
    }
    return map
  }, [schedule])

  async function onChangeDay(weekday: number, routineId: string) {
    setSavingDay(weekday)
    setError(null)
    try {
      await setRoutineForWeekday({
        userId,
        weekday,
        routineId: routineId || null,
      })
      await onChanged()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes('routine_schedule')
            ? 'Falta migración 009 (calendario). Ejecuta supabase/migrations/009_routine_schedule.sql'
            : err.message
          : 'No se pudo guardar el día',
      )
    } finally {
      setSavingDay(null)
    }
  }

  return (
    <div className="ml-stat-card space-y-3">
      <div>
        <h3 className="font-semibold ml-title">Calendario semanal</h3>
        <p className="text-xs ml-muted">Asigna una rutina a cada día. Hoy resaltado.</p>
      </div>

      <div className="space-y-2">
        {WEEKDAY_ORDER.map((weekday) => {
          const selected = byDay.get(weekday) ?? ''
          const isToday = weekday === today
          return (
            <div
              key={weekday}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5"
              style={
                isToday
                  ? {
                      background: 'rgba(240,120,53,0.12)',
                      boxShadow: 'inset 0 0 0 1px var(--ml-primary)',
                    }
                  : undefined
              }
            >
              <span
                className="w-10 shrink-0 text-xs font-bold"
                style={{ color: isToday ? 'var(--ml-primary)' : 'var(--ml-text-muted)' }}
              >
                {WEEKDAY_LABELS[weekday]}
              </span>
              <select
                className="input-field !py-2 text-sm"
                value={selected}
                disabled={savingDay === weekday || routines.length === 0}
                onChange={(e) => void onChangeDay(weekday, e.target.value)}
              >
                <option value="">— Descanso / sin rutina —</option>
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.is_favorite ? '★ ' : ''}
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {routines.length === 0 && (
        <p className="text-xs ml-muted">Guarda una rutina primero para asignarla a los días.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
