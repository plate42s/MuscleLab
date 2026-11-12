import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dayRangeIso, sumFoodLogs } from '../lib/foodStats'
import { supabase } from '../lib/supabase'
import type { FoodLog } from '../types/database'

export function Food() {
  const { user, profile } = useAuth()
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [notes, setNotes] = useState('')
  const [eatenAt, setEatenAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { from, to } = dayRangeIso()

    const { data, error: fetchError } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('eaten_at', from)
      .lt('eaten_at', to)
      .order('eaten_at', { ascending: false })

    setLoading(false)

    if (fetchError) {
      setError(
        fetchError.message.includes('food_logs')
          ? 'Falta crear la tabla food_logs. Ejecuta supabase/migrations/005_f3_food_logs.sql'
          : fetchError.message,
      )
      setLogs([])
      return
    }

    setLogs((data as FoodLog[]) ?? [])
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const totals = useMemo(() => sumFoodLogs(logs), [logs])
  const target = profile?.daily_kcal_target ?? null
  const remaining = target != null ? target - totals.calories : null
  const progressPct =
    target && target > 0 ? Math.min(100, Math.round((totals.calories / target) * 100)) : 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setMessage(null)

    const { error: insertError } = await supabase.from('food_logs').insert({
      user_id: user.id,
      name: name.trim(),
      calories: calories ? Number(calories) : null,
      protein_g: protein ? Number(protein) : null,
      carbs_g: carbs ? Number(carbs) : null,
      fat_g: fat ? Number(fat) : null,
      notes: notes.trim() || null,
      eaten_at: new Date(eatenAt).toISOString(),
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }

    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setNotes('')
    setMessage('Comida registrada')
    await load()
  }

  async function removeLog(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    const { error: deleteError } = await supabase.from('food_logs').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await load()
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold ml-title">Comida</h1>
        <p className="text-sm ml-muted">Calorías y macros básicos del día</p>
      </div>

      <div className="card card-accent space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs ml-muted">Hoy</p>
            <p className="font-display text-3xl font-bold ml-title">{totals.calories}</p>
            <p className="text-xs ml-muted">
              kcal{target != null ? ` / ${target} objetivo` : ''}
            </p>
          </div>
          {remaining != null && (
            <span className="badge-gold">
              {remaining >= 0 ? `${remaining} restantes` : `${Math.abs(remaining)} sobre`}
            </span>
          )}
        </div>

        {target != null && target > 0 && (
          <div className="h-3 overflow-hidden rounded-full bg-[var(--ml-oat)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                background:
                  progressPct > 100
                    ? 'linear-gradient(90deg, var(--ml-brick), var(--ml-deep))'
                    : 'linear-gradient(90deg, var(--ml-gold), var(--ml-crimson))',
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-xs ml-muted">Proteína</p>
            <p className="font-semibold ml-title">{Math.round(totals.protein_g)} g</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-xs ml-muted">Carbs</p>
            <p className="font-semibold ml-title">{Math.round(totals.carbs_g)} g</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-xs ml-muted">Grasa</p>
            <p className="font-semibold ml-title">{Math.round(totals.fat_g)} g</p>
          </div>
        </div>

        {target == null && (
          <p className="text-xs ml-muted">
            Define tu objetivo de kcal en{' '}
            <Link className="font-semibold underline" style={{ color: 'var(--ml-gold-dark)' }} to="/perfil">
              Perfil
            </Link>
            .
          </p>
        )}
      </div>

      <form className="card card-accent space-y-3" onSubmit={onSubmit}>
        <h2 className="font-semibold ml-title">Registrar comida</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Qué comiste</span>
          <input
            className="input-field"
            required
            placeholder="Ej. pollo con arroz"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Hora</span>
          <input
            className="input-field"
            type="datetime-local"
            required
            value={eatenAt}
            onChange={(e) => setEatenAt(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Calorías</span>
            <input
              className="input-field"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Proteína g</span>
            <input
              className="input-field"
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Carbs g</span>
            <input
              className="input-field"
              inputMode="decimal"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Grasa g</span>
            <input
              className="input-field"
              inputMode="decimal"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </label>
        </div>

        <input
          className="input-field"
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm" style={{ color: 'var(--ml-brick)' }}>{message}</p>}

        <button className="btn-primary w-full" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Añadir comida'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold ml-title">Registros de hoy ({totals.count})</h2>
        {loading && <p className="text-sm ml-muted">Cargando…</p>}
        {!loading && logs.length === 0 && (
          <div className="card">
            <p className="text-sm ml-muted">Aún no registras comida hoy.</p>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="card flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold ml-title">{log.name}</p>
              <p className="text-xs ml-muted">
                {new Date(log.eaten_at).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {log.calories != null ? ` · ${log.calories} kcal` : ''}
              </p>
              <p className="mt-1 text-xs ml-muted">
                P {log.protein_g ?? 0}g · C {log.carbs_g ?? 0}g · G {log.fat_g ?? 0}g
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold"
              style={{ color: 'var(--ml-crimson)' }}
              onClick={() => void removeLog(log.id)}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
