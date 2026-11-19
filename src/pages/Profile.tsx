import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Goal, Level, Modality } from '../types/database'

export function Profile() {
  const { profile, updateProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [goal, setGoal] = useState<Goal>('mixto')
  const [level, setLevel] = useState<Level>('intermedio')
  const [modality, setModality] = useState<Modality>('mixto')
  const [weightKg, setWeightKg] = useState('')
  const [bodyFatPct, setBodyFatPct] = useState('')
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
    setBodyFatPct(profile.body_fat_pct?.toString() ?? '')
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
      body_fat_pct: bodyFatPct ? Number(bodyFatPct) : null,
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
        <h1 className="hidden font-display text-2xl font-bold ml-title md:block">Perfil</h1>
        <p className="text-sm ml-muted">
          @{profile?.username ?? 'sin-usuario'}
          {profile?.role === 'admin' && (
            <span className="badge-gold ml-2 align-middle">admin</span>
          )}
        </p>
      </div>

      {/* Accesos fuera del bottom nav móvil (Comida no es foco actual) */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link to="/comida" className="ml-stat-card block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">Nutrición</p>
          <p className="mt-1 font-semibold ml-title">Comida</p>
        </Link>
        <Link to="/coach" className="ml-stat-card block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">Más</p>
          <p className="mt-1 font-semibold ml-title">max ia steel</p>
          <p className="mt-0.5 text-xs ml-muted">Coach · F4</p>
        </Link>
        {profile?.role === 'admin' && (
          <Link to="/usuarios" className="ml-stat-card col-span-2 block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">Admin</p>
            <p className="mt-1 font-semibold ml-title">Usuarios</p>
          </Link>
        )}
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

        <div className="grid grid-cols-2 gap-3">
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
            <span className="mb-1 block font-medium">Grasa corporal (%)</span>
            <input
              className="input-field"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="Ej. 18.5"
              value={bodyFatPct}
              onChange={(e) => setBodyFatPct(e.target.value)}
            />
          </label>
        </div>

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

        {error && <p className="text-sm text-danger">{error}</p>}
        {message && <p className="text-sm" style={{ color: 'var(--ml-success)' }}>{message}</p>}

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
