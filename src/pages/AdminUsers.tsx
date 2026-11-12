import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createUser, deleteUser, listUsers, updateUser, type AdminUser } from '../lib/adminApi'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/database'

const emptyForm = {
  username: '',
  display_name: '',
  password: '',
  role: 'user' as UserRole,
}

export function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({
    username: '',
    display_name: '',
    password: '',
    role: 'user' as UserRole,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listUsers()
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar usuarios')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await createUser({
        username: form.username,
        password: form.password,
        display_name: form.display_name || form.username,
        role: form.role,
      })
      setForm(emptyForm)
      setMessage('Usuario creado')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(row: AdminUser) {
    setEditing(row)
    setEditForm({
      username: row.username ?? '',
      display_name: row.display_name ?? '',
      password: '',
      role: row.role,
    })
    setMessage(null)
    setError(null)
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateUser({
        id: editing.id,
        username: editForm.username,
        display_name: editForm.display_name,
        role: editForm.role,
        password: editForm.password || undefined,
      })
      setEditing(null)
      setMessage('Usuario actualizado')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(row: AdminUser) {
    if (row.id === user?.id) {
      setError('No puedes eliminar tu propia cuenta')
      return
    }
    if (!confirm(`¿Eliminar a @${row.username ?? row.id}?`)) return
    setError(null)
    setMessage(null)
    try {
      await deleteUser(row.id)
      setMessage('Usuario eliminado')
      if (editing?.id === row.id) setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold ml-title">Usuarios</h1>
        <p className="text-sm ml-muted">CRUD solo para administradores</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm" style={{ color: 'var(--ml-brick)' }}>{message}</p>}

      <div className="card text-sm ml-muted">
        En <strong>local (`npm run dev`)</strong> puedes listar usuarios. Crear/editar contraseña/eliminar
        requiere la Function de Netlify (producción o <code>netlify dev</code>).
      </div>

      <form className="card card-accent space-y-3" onSubmit={onCreate}>
        <h2 className="font-semibold ml-title">Crear usuario</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Usuario</span>
            <input
              className="input-field"
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Nombre</span>
            <input
              className="input-field"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Contraseña</span>
            <input
              className="input-field"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Rol</span>
            <select
              className="input-field"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>
        <button className="btn-primary w-full sm:w-auto" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Crear'}
        </button>
      </form>

      {editing && (
        <form className="card card-accent space-y-3" onSubmit={onUpdate}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold ml-title">Editar @{editing.username}</h2>
            <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Usuario</span>
              <input
                className="input-field"
                required
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Nombre</span>
              <input
                className="input-field"
                value={editForm.display_name}
                onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Nueva contraseña (opcional)</span>
              <input
                className="input-field"
                type="password"
                minLength={6}
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Rol</span>
              <select
                className="input-field"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
          </div>
          <button className="btn-gold w-full sm:w-auto" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}

      <div className="card card-accent space-y-3">
        <h2 className="font-semibold ml-title">Listado</h2>
        {loading && <p className="text-sm ml-muted">Cargando…</p>}
        {!loading && users.length === 0 && (
          <p className="text-sm ml-muted">No hay usuarios.</p>
        )}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-ml">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">@{row.username ?? '—'}</td>
                    <td>{row.display_name ?? '—'}</td>
                    <td>
                      {row.role === 'admin' ? (
                        <span className="badge-gold">admin</span>
                      ) : (
                        <span className="text-sm ml-muted">user</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold"
                          style={{ color: 'var(--ml-gold-dark)' }}
                          onClick={() => startEdit(row)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold"
                          style={{ color: 'var(--ml-crimson)' }}
                          onClick={() => void onDelete(row)}
                          disabled={row.id === user?.id}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
