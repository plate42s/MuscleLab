/** Dominio interno: Supabase Auth exige email; la UI usa usuario. */
export const AUTH_EMAIL_DOMAIN = 'musclelab.local'

export function usernameToEmail(username: string): string {
  const normalized = username.trim().toLowerCase()
  if (normalized.includes('@')) return normalized
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return ''
  const [local] = email.split('@')
  return local || email
}
