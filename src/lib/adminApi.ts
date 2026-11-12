import { supabase } from './supabase'
import type { Profile, UserRole } from '../types/database'

const FUNCTION_PATH = '/.netlify/functions/admin-users'

export type AdminUser = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'role' | 'goal' | 'level' | 'modality' | 'created_at' | 'updated_at'
>

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No hay sesión')
  return { Authorization: `Bearer ${token}` }
}

async function callAdmin<T>(
  method: string,
  options?: { body?: unknown; query?: Record<string, string> },
): Promise<T> {
  const headers = await authHeader()
  const url = new URL(FUNCTION_PATH, window.location.origin)
  if (options?.query) {
    for (const [k, v] of Object.entries(options.query)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      'La función admin no está disponible aquí. En local usa `netlify dev`, o prueba en Netlify con SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.error || `Error ${res.status}`)
  }
  return payload as T
}

async function listUsersFromDb(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, role, goal, level, modality, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as AdminUser[]) ?? []
}

export async function listUsers() {
  try {
    const data = await callAdmin<{ users: AdminUser[] }>('GET')
    return { users: data.users ?? [] }
  } catch {
    // Fallback local / si la function no está desplegada aún
    const users = await listUsersFromDb()
    return { users }
  }
}

export function createUser(input: {
  username: string
  password: string
  display_name?: string
  role?: UserRole
}) {
  return callAdmin<{ user: AdminUser }>('POST', { body: input })
}

export function updateUser(input: {
  id: string
  username?: string
  display_name?: string
  role?: UserRole
  password?: string
}) {
  return callAdmin<{ ok: true }>('PATCH', { body: input })
}

export function deleteUser(id: string) {
  return callAdmin<{ ok: true }>('DELETE', { query: { id } })
}
