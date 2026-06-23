import { cookies } from 'next/headers'
export interface SessionUser { id: string; email: string; full_name: string; role: string; org_id: string }
export function getSession(): SessionUser | null {
  const raw = cookies().get('att_session')?.value
  if (!raw) return null
  try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch { return null }
}
export function createSessionCookie(u: SessionUser) { return Buffer.from(JSON.stringify(u)).toString('base64') }
