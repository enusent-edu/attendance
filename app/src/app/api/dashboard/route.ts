import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const today = new Date().toISOString().split('T')[0]
  const [mc, gc, lc] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM attendance.members WHERE org_id=$1 AND is_active=true`, [s.org_id]),
    db.query(`SELECT COUNT(*) FROM attendance.groups WHERE org_id=$1`, [s.org_id]),
    db.query(`SELECT status FROM attendance.logs WHERE org_id=$1 AND date=$2`, [s.org_id, today]),
  ])
  const logs = lc.rows
  const present = logs.filter(l => l.status === 'present' || l.status === 'late').length
  return NextResponse.json({
    members: parseInt(mc.rows[0].count),
    groups: parseInt(gc.rows[0].count),
    today_present: present,
    today_total: logs.length,
  })
}
