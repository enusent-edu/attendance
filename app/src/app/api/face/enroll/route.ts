import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { enrollFace } from '@/lib/deepface'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { image, member_id } = await req.json()
  try {
    const encoding = await enrollFace(image)
    const db = supabaseAdmin()
    await db.schema('attendance').from('members').update({ face_encoding: encoding }).eq('id', member_id).eq('org_id', s.org_id)
    return NextResponse.json({ ok: true, message: 'Face enrolled successfully' })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Enroll failed' }, { status: 400 })
  }
}
