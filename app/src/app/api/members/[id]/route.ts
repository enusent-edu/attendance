import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.schema('attendance').from('members')
    .update(body).eq('id',params.id).eq('org_id',s.org_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { error } = await db.schema('attendance').from('members')
    .update({ is_active: false }).eq('id',params.id).eq('org_id',s.org_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
