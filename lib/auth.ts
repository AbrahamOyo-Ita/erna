export type AuthMethod = 'email' | 'phone'

export function normalizeNigerianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('234')) return `+${digits}`
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`
  return `+234${digits}`
}

export function authIdentifier(method: AuthMethod, value: string) {
  return method === 'phone' ? normalizeNigerianPhone(value) : value.trim().toLowerCase()
}

export function safeNextPath(value: string | null | undefined, fallback = '/app') {
  if (!value || !value.startsWith('/') || /[\u0000-\u001f\\]/.test(value)) return fallback
  let decoded: string
  try { decoded = decodeURIComponent(value) } catch { return fallback }
  if (decoded.startsWith('//') || /[\u0000-\u001f\\]/.test(decoded)) return fallback

  try {
    const base = new URL('https://erna.invalid')
    const destination = new URL(decoded, base)
    if (destination.origin !== base.origin || !destination.pathname.startsWith('/')) return fallback
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch { return fallback }
}
