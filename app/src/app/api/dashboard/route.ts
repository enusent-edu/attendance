import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin(); const org_id = s.org_id
  const today = new Date().toISOString().split('T')[0]
  const [members, groups, todayLogs] = await Promise.all([
    db.schema('attendance').from('members').select('id',{count:'exact',head:true}).eq('org_id',org_id).eq('is_active',true),
    db.schema('attendance').from('groups').select('id',{count:'exact',head:true}).eq('org_id',org_id),
    db.schema('attendance').from('logs').select('id,status').eq('org_id',org_id).eq('date',today),
  ])
  const present = (todayLogs.data||[]).filter(l=>l.status==='present'||l.status==='late').length
  return NextResponse.json({ members: members.count||0, groups: groups.count||0, today_present: present, today_total: todayLogs.data?.length||0 })
}
