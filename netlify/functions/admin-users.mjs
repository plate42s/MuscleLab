import { createClient } from '@supabase/supabase-js'

const AUTH_EMAIL_DOMAIN = 'musclelab.local'

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

function usernameToEmail(username) {
  const normalized = String(username || '')
    .trim()
    .toLowerCase()
  if (!normalized) return null
  if (normalized.includes('@')) return normalized
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`
}

function getEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY
  return { url, anon, service }
}

async function requireAdmin(event) {
  const { url, anon, service } = getEnv()
  if (!url || !anon || !service) {
    return {
      error: json(500, {
        error:
          'Faltan variables SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SERVICE_ROLE_KEY en Netlify',
      }),
    }
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return { error: json(401, { error: 'No autorizado' }) }
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) {
    return { error: json(401, { error: 'Sesión inválida' }) }
  }

  const adminClient = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role, username')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: json(403, { error: 'Solo administradores' }) }
  }

  return { adminClient, adminId: user.id, profile }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {})
  }

  const gate = await requireAdmin(event)
  if (gate.error) return gate.error
  const { adminClient, adminId } = gate

  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('id, username, display_name, role, goal, level, modality, created_at, updated_at')
        .order('created_at', { ascending: true })
      if (error) return json(400, { error: error.message })
      return json(200, { users: data ?? [] })
    }

    const body = event.body ? JSON.parse(event.body) : {}

    if (event.httpMethod === 'POST') {
      const username = String(body.username || '')
        .trim()
        .toLowerCase()
      const password = String(body.password || '')
      const displayName = String(body.display_name || username).trim()
      const role = body.role === 'admin' ? 'admin' : 'user'

      if (!username || password.length < 6) {
        return json(400, { error: 'Usuario y contraseña (mín. 6) son obligatorios' })
      }

      const email = usernameToEmail(username)
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName, username },
      })

      if (createError || !created.user) {
        return json(400, { error: createError?.message || 'No se pudo crear el usuario' })
      }

      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: created.user.id,
        username,
        display_name: displayName,
        role,
        goal: 'mixto',
        level: 'intermedio',
        modality: 'mixto',
      })

      if (profileError) {
        return json(400, { error: profileError.message })
      }

      return json(201, {
        user: {
          id: created.user.id,
          username,
          display_name: displayName,
          role,
        },
      })
    }

    if (event.httpMethod === 'PATCH') {
      const id = String(body.id || '')
      if (!id) return json(400, { error: 'id requerido' })

      const patch = {}
      if (typeof body.display_name === 'string') patch.display_name = body.display_name.trim()
      if (typeof body.username === 'string') {
        patch.username = body.username.trim().toLowerCase()
      }
      if (body.role === 'admin' || body.role === 'user') {
        if (id === adminId && body.role !== 'admin') {
          return json(400, { error: 'No puedes quitarte el rol admin a ti mismo' })
        }
        patch.role = body.role
      }

      if (Object.keys(patch).length > 0) {
        const { error: updateError } = await adminClient.from('profiles').update(patch).eq('id', id)
        if (updateError) return json(400, { error: updateError.message })
      }

      if (body.password) {
        if (String(body.password).length < 6) {
          return json(400, { error: 'La contraseña debe tener mínimo 6 caracteres' })
        }
        const { error: passError } = await adminClient.auth.admin.updateUserById(id, {
          password: String(body.password),
        })
        if (passError) return json(400, { error: passError.message })
      }

      if (patch.username) {
        const email = usernameToEmail(patch.username)
        const { error: emailError } = await adminClient.auth.admin.updateUserById(id, { email })
        if (emailError) return json(400, { error: emailError.message })
      }

      return json(200, { ok: true })
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id || body.id
      if (!id) return json(400, { error: 'id requerido' })
      if (id === adminId) {
        return json(400, { error: 'No puedes eliminar tu propia cuenta' })
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(id)
      if (deleteError) return json(400, { error: deleteError.message })
      return json(200, { ok: true })
    }

    return json(405, { error: 'Método no permitido' })
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : 'Error interno' })
  }
}
