import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createSessionCookie } from '@/lib/auth'
import crypto from 'crypto'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const { email, password } = await req.json()
  const db = supabaseAdmin()
  const { data: user } = await db.schema('attendance').from('users')
    .select('id,email,full_name,role,org_id,password_hash,is_active')
    .eq('email', email).eq('is_active', true).single()
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  if (user.password_hash !== hash) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const session = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, org_id: user.org_id }
  const res = NextResponse.json({ ok: true, user: session })
  res.cookies.set('att_session', createSessionCookie(session), { httpOnly: true, sameSite: 'lax', maxAge: 60*60*8 })
  return res
}
