import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const today = new Date().toISOString().split('T')[0]
  const [mc, gc, lc, alertRows] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM attendance.members WHERE org_id=$1 AND is_active=true`, [s.org_id]),
    db.query(`SELECT COUNT(*) FROM attendance.groups WHERE org_id=$1`, [s.org_id]),
    db.query(`SELECT status FROM attendance.logs WHERE org_id=$1 AND date=$2`, [s.org_id, today]),
    db.query(
      `SELECT m.full_name, m.member_no, g.name as group_name,
              l.status, l.time_in, l.time_out,
              COALESCE(ms.shift_start, g.shift_start)::text as shift_start,
              COALESCE(ms.shift_end, g.shift_end)::text as shift_end
       FROM attendance.logs l
       JOIN attendance.members m ON m.id=l.member_id
       JOIN attendance.groups g ON g.id=l.group_id
       LEFT JOIN attendance.member_schedules ms ON ms.member_id=l.member_id AND ms.date=l.date
       WHERE l.org_id=$1 AND l.date=$2 AND (l.status='late' OR l.time_out IS NULL)
       ORDER BY l.time_in DESC`,
      [s.org_id, today]
    )
  ])
  const logs = lc.rows
  const present = logs.filter(l => l.status === 'present' || l.status === 'late').length
  return NextResponse.json({
    members: parseInt(mc.rows[0].count),
    groups: parseInt(gc.rows[0].count),
    today_present: present,
    today_total: logs.length,
    alerts: alertRows.rows,
  })
}
