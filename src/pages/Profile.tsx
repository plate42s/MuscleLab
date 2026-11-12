import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import type { Goal, Level, Modality } from '../types/database'

export function Profile() {
  const { profile, updateProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [goal, setGoal] = useState<Goal>('mixto')
  const [level, setLevel] = useState<Level>('intermedio')
  const [modality, setModality] = useState<Modality>('mixto')
  const [weightKg, setWeightKg] = useState('')
  const [dailyKcal, setDailyKcal] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setGoal((profile.goal as Goal) ?? 'mixto')
    setLevel((profile.level as Level) ?? 'intermedio')
    setModality((profile.modality as Modality) ?? 'mixto')
    setWeightKg(profile.weight_kg?.toString() ?? '')
    setDailyKcal(profile.daily_kcal_target?.toString() ?? '')
  }, [profile])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    const result = await updateProfile({
      display_name: displayName.trim() || null,
      goal,
      level,
      modality,
      weight_kg: weightKg ? Number(weightKg) : null,
      daily_kcal_target: dailyKcal ? Number(dailyKcal) : null,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage('Perfil actualizado')
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold ml-title">Perfil</h1>
        <p className="text-sm text-ink-700">
          @{profile?.username ?? 'sin-usuario'}
          {profile?.role === 'admin' && (
            <span className="badge-gold ml-2 align-middle">admin</span>
          )}
        </p>
      </div>

      <form className="card space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nombre</span>
          <input className="input-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Objetivo</span>
          <select className="input-field" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            <option value="fuerza">Fuerza</option>
            <option value="skills">Skills</option>
            <option value="estetica">Estética</option>
            <option value="mixto">Mixto</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nivel</span>
          <select className="input-field" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Modalidad</span>
          <select
            className="input-field"
            value={modality}
            onChange={(e) => setModality(e.target.value as Modality)}
          >
            <option value="calistenia">Calistenia</option>
            <option value="gym">Gym</option>
            <option value="mixto">Mixto</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Peso (kg)</span>
          <input
            className="input-field"
            type="number"
            step="0.1"
            min="0"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Objetivo kcal / día</span>
          <input
            className="input-field"
            type="number"
            min="0"
            step="1"
            placeholder="Ej. 2200"
            value={dailyKcal}
            onChange={(e) => setDailyKcal(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm" style={{ color: 'var(--ml-brick)' }}>{message}</p>}

        <button className="btn-primary w-full" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </form>

      <button className="btn-secondary w-full" type="button" onClick={() => void signOut()}>
        Cerrar sesión
      </button>
    </div>
  )
}
