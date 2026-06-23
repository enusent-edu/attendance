import { cookies } from 'next/headers'

export interface SessionUser {
  id: string; email: string; full_name: string; role: string; org_id: string
}

export function getSession(): SessionUser | null {
  try {
    const cookieStore = cookies()
    const raw = cookieStore.get('att_session')?.value
    if (!raw) return null
    return JSON.parse(Buffer.from(raw, 'base64').toString())
  } catch { return null }
}

export function createSessionCookie(u: SessionUser): string {
  return Buffer.from(JSON.stringify(u)).toString('base64')
}
