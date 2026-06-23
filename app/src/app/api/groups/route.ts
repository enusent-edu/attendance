import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data, error } = await db.schema('attendance').from('groups')
    .select('id,name,description,attendance_method,created_at').eq('org_id',s.org_id).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.schema('attendance').from('groups')
    .insert([{...body, org_id: s.org_id}]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
