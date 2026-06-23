import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')||''
  const db = supabaseAdmin()
  let query = db.schema('attendance').from('members')
    .select('id,member_no,full_name,email,phone,meta,photo_url,face_encoding,qr_code,is_active,created_at')
    .eq('org_id',s.org_id).order('full_name')
  if (q) query = query.ilike('full_name',`%${q}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()
  const qr_code = `ATT-${Date.now()}`
  const { data, error } = await db.schema('attendance').from('members')
    .insert([{...body, org_id: s.org_id, qr_code}]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
