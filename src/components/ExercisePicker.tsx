import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { listExerciseFavorites, toggleExerciseFavorite } from '../lib/routines'
import { supabase } from '../lib/supabase'
import type { Exercise, ExerciseModality } from '../types/database'

interface ExercisePickerProps {
  open: boolean
  userId: string
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

const modalities: Array<ExerciseModality | 'todas'> = ['todas', 'calistenia', 'gym', 'core', 'cardio']

export function ExercisePicker({ open, userId, onClose, onSelect }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [modality, setModality] = useState<ExerciseModality | 'todas'>('todas')
  const [muscleGroup, setMuscleGroup] = useState('todas')
  const [tab, setTab] = useState<'todos' | 'favoritos'>('todos')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      supabase.from('exercises').select('*').eq('is_active', true).order('name'),
      listExerciseFavorites(userId).catch((err: Error) => {
        throw err
      }),
    ])
      .then(([exRes, favIds]) => {
        if (cancelled) return
        setLoading(false)
        if (exRes.error) {
          setError(exRes.error.message)
          return
        }
        setExercises((exRes.data as Exercise[]) ?? [])
        setFavoriteIds(new Set(favIds))
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoading(false)
        setError(
          err.message.includes('exercise_favorites')
            ? 'Falta migración 008 (favoritos). Ejecuta supabase/migrations/008_favorites_routines.sql'
            : err.message,
        )
      })

    return () => {
      cancelled = true
    }
  }, [open, userId])

  const muscleGroups = useMemo(() => {
    const set = new Set(exercises.map((e) => e.muscle_group))
    return ['todas', ...Array.from(set).sort()]
  }, [exercises])

  const filtered = useMemo(() => {
    return exercises.filter((exercise) => {
      if (tab === 'favoritos' && !favoriteIds.has(exercise.id)) return false
      if (modality !== 'todas' && exercise.modality !== modality) return false
      if (muscleGroup !== 'todas' && exercise.muscle_group !== muscleGroup) return false
      if (query.trim() && !exercise.name.toLowerCase().includes(query.trim().toLowerCase())) {
        return false
      }
      return true
    })
  }, [exercises, favoriteIds, modality, muscleGroup, query, tab])

  const favoriteExercises = useMemo(
    () => exercises.filter((e) => favoriteIds.has(e.id)).slice(0, 12),
    [exercises, favoriteIds],
  )

  async function onToggleFavorite(exerciseId: string, e: MouseEvent) {
    e.stopPropagation()
    const isFav = favoriteIds.has(exerciseId)
    try {
      await toggleExerciseFavorite(userId, exerciseId, isFav)
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.delete(exerciseId)
        else next.add(exerciseId)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar favorito')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--ml-surface)] p-4 shadow-xl md:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold ml-title">Añadir ejercicio</h2>
          <button className="btn-secondary !px-3 !py-2" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'favoritos', label: 'Favoritos' },
            ] as const
          ).map((opt) => {
            const selected = tab === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={
                  selected
                    ? { background: 'var(--ml-primary)', color: '#111315' }
                    : {
                        background: 'var(--ml-elevated)',
                        color: 'var(--ml-text-muted)',
                        boxShadow: 'inset 0 0 0 1px var(--ml-border)',
                      }
                }
                onClick={() => setTab(opt.id)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <input
          className="input-field mb-3"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="mb-3 flex flex-wrap gap-2">
          {modalities.map((item) => {
            const selected = modality === item
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
                style={
                  selected
                    ? {
                        background: 'var(--ml-primary)',
                        color: '#111315',
                        boxShadow: '0 0 0 1px var(--ml-primary)',
                      }
                    : {
                        background: 'var(--ml-elevated)',
                        color: 'var(--ml-text-muted)',
                        boxShadow: 'inset 0 0 0 1px var(--ml-border)',
                      }
                }
                onClick={() => setModality(item)}
              >
                {item}
              </button>
            )
          })}
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
          {error && <p className="text-sm text-danger">{error}</p>}

          {tab === 'todos' && !loading && favoriteExercises.length > 0 && !query.trim() && (
            <div className="mb-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
                Favoritos rápidos
              </p>
              {favoriteExercises.map((exercise) => (
                <ExerciseRow
                  key={`fav-${exercise.id}`}
                  exercise={exercise}
                  isFavorite
                  onSelect={() => {
                    onSelect(exercise)
                    onClose()
                  }}
                  onToggleFavorite={(ev) => void onToggleFavorite(exercise.id, ev)}
                />
              ))}
              <div className="border-t border-[var(--ml-border)] pt-2" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-sm ml-muted">
              {tab === 'favoritos'
                ? 'Aún no tienes favoritos. Marca ejercicios con ★.'
                : 'No hay ejercicios con esos filtros.'}
            </p>
          )}
          {filtered.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              isFavorite={favoriteIds.has(exercise.id)}
              onSelect={() => {
                onSelect(exercise)
                onClose()
              }}
              onToggleFavorite={(ev) => void onToggleFavorite(exercise.id, ev)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ExerciseRow({
  exercise,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  exercise: Exercise
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: (e: MouseEvent) => void
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-[var(--ml-border)] bg-[var(--ml-elevated)] px-2 py-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center justify-between px-1 py-1 text-left"
        onClick={onSelect}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold ml-title">{exercise.name}</span>
          <span className="text-xs ml-muted">
            {exercise.modality} · {exercise.muscle_group} · {exercise.load_type}
          </span>
        </span>
        <span style={{ color: 'var(--ml-primary)' }} className="ml-2 shrink-0 font-bold">
          +
        </span>
      </button>
      <button
        type="button"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        className="shrink-0 rounded-lg px-2 py-2 text-lg leading-none"
        style={{ color: isFavorite ? 'var(--ml-primary)' : 'var(--ml-text-muted)' }}
        onClick={onToggleFavorite}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  )
}
