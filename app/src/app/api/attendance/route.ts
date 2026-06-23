import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const group_id = searchParams.get('group_id')
  const db = supabaseAdmin()
  let query = db.schema('attendance').from('logs')
    .select('id,date,time_in,time_out,method,status,remarks,members(id,full_name,member_no,photo_url),groups(name)')
    .eq('org_id',s.org_id).eq('date',date).order('time_in',{ascending:false})
  if (group_id) query = query.eq('group_id', group_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.schema('attendance').from('logs')
    .upsert([{ ...body, org_id: s.org_id, recorded_by: s.id,
      date: body.date || new Date().toISOString().split('T')[0],
      time_in: body.time_in || new Date().toISOString()
    }], { onConflict: 'member_id,date' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
