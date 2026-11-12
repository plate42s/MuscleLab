import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { BodyMetric } from '../types/database'
import { SimpleBars } from './SimpleBars'
import { weightSeries } from '../lib/progressStats'

export function BodyMetricsPanel({
  userId,
  metrics,
  onChanged,
}: {
  userId: string
  metrics: BodyMetric[]
  onChanged: () => Promise<void> | void
}) {
  const [weightKg, setWeightKg] = useState('')
  const [waistCm, setWaistCm] = useState('')
  const [chestCm, setChestCm] = useState('')
  const [armCm, setArmCm] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const latest = metrics[0]
  const chart = weightSeries(metrics).slice(-8)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    const { error: insertError } = await supabase.from('body_metrics').insert({
      user_id: userId,
      weight_kg: weightKg ? Number(weightKg) : null,
      waist_cm: waistCm ? Number(waistCm) : null,
      chest_cm: chestCm ? Number(chestCm) : null,
      arm_cm: armCm ? Number(armCm) : null,
      notes: notes.trim() || null,
      recorded_at: new Date().toISOString(),
    })

    setSaving(false)
    if (insertError) {
      setError(
        insertError.message.includes('body_metrics')
          ? 'Falta crear la tabla body_metrics. Ejecuta supabase/migrations/004_f2_body_metrics.sql'
          : insertError.message,
      )
      return
    }

    setWeightKg('')
    setWaistCm('')
    setChestCm('')
    setArmCm('')
    setNotes('')
    setMessage('Medidas guardadas')
    await onChanged()
  }

  return (
    <div className="card card-accent space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold ml-title">Medidas corporales</h2>
          <p className="text-sm ml-muted">Peso y circunferencias básicas</p>
        </div>
        {latest?.weight_kg != null && (
          <span className="badge-gold">{latest.weight_kg} kg</span>
        )}
      </div>

      {latest && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-xs ml-muted">Peso</p>
            <p className="font-semibold ml-title">{latest.weight_kg ?? '—'} kg</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-xs ml-muted">Cintura</p>
            <p className="font-semibold ml-title">{latest.waist_cm ?? '—'} cm</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-xs ml-muted">Pecho</p>
            <p className="font-semibold ml-title">{latest.chest_cm ?? '—'} cm</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-xs ml-muted">Brazo</p>
            <p className="font-semibold ml-title">{latest.arm_cm ?? '—'} cm</p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium ml-title">Peso reciente</p>
        <SimpleBars items={chart} unit="kg" emptyText="Registra tu primer peso" />
      </div>

      <form className="space-y-3 border-t border-[var(--ml-oat)] pt-3" onSubmit={onSubmit}>
        <p className="text-sm font-medium ml-title">Nueva medición</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Peso kg</span>
            <input className="input-field" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Cintura cm</span>
            <input className="input-field" inputMode="decimal" value={waistCm} onChange={(e) => setWaistCm(e.target.value)} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Pecho cm</span>
            <input className="input-field" inputMode="decimal" value={chestCm} onChange={(e) => setChestCm(e.target.value)} />
          </label>
          <label className="text-xs">
            <span className="mb-1 block ml-muted">Brazo cm</span>
            <input className="input-field" inputMode="decimal" value={armCm} onChange={(e) => setArmCm(e.target.value)} />
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
          {saving ? 'Guardando…' : 'Guardar medidas'}
        </button>
      </form>
    </div>
  )
}
