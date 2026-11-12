import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Register() {
  const { signUp, user, configured, loading } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!configured) return <Navigate to="/setup" replace />
  if (!loading && user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setInfo(null)
    const result = await signUp(email.trim(), password, displayName.trim())
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setInfo('Cuenta creada. Si tu proyecto pide confirmar email, revisa tu bandeja. Si no, ya puedes entrar.')
    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-crimson-deep">Crear cuenta</h1>
          <p className="mt-1 text-sm text-ink-700">Grupo de prueba · español</p>
        </div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nombre</span>
            <input
              className="input-field"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              className="input-field"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Contraseña</span>
            <input
              className="input-field"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-accent-dark">{info}</p>}
          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? 'Creando…' : 'Registrarme'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link className="font-semibold text-accent-dark" to="/login">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
