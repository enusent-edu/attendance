import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('mode') || 'daily'   // daily | range | monthly | member
  const date_from = searchParams.get('date_from')
  const date_to   = searchParams.get('date_to')
  const group_id  = searchParams.get('group_id')
  const member_id = searchParams.get('member_id')
  const month     = searchParams.get('month')  // YYYY-MM for monthly

  const params: (string)[] = [s.org_id]
  let dateFilter = ''

  if (mode === 'monthly' && month) {
    params.push(month)
    dateFilter = `AND to_char(l.date,'YYYY-MM')=$${params.length}`
  } else if (date_from && date_to) {
    params.push(date_from); params.push(date_to)
    dateFilter = `AND l.date BETWEEN $${params.length-1} AND $${params.length}`
  } else if (date_from) {
    params.push(date_from)
    dateFilter = `AND l.date=$${params.length}`
  }

  let groupFilter = ''; if (group_id) { params.push(group_id); groupFilter = `AND l.group_id=$${params.length}` }
  let memberFilter = ''; if (member_id) { params.push(member_id); memberFilter = `AND l.member_id=$${params.length}` }

  const { rows } = await db.query(
    `SELECT l.id, l.date, l.time_in, l.time_out, l.method, l.status, l.remarks,
            m.full_name, m.member_no,
            g.name as group_name,
            COALESCE(ms.shift_start, g.shift_start)::text as shift_start,
            COALESCE(ms.shift_end,   g.shift_end)::text   as shift_end,
            CASE WHEN l.time_out IS NOT NULL
              THEN EXTRACT(EPOCH FROM (l.time_out - l.time_in))/3600
              ELSE NULL
            END as hours_worked
     FROM attendance.logs l
     JOIN attendance.members m ON m.id=l.member_id
     JOIN attendance.groups g  ON g.id=l.group_id
     LEFT JOIN attendance.member_schedules ms ON ms.member_id=l.member_id AND ms.date=l.date
     WHERE l.org_id=$1 ${dateFilter} ${groupFilter} ${memberFilter}
     ORDER BY l.date DESC, m.full_name ASC`,
    params
  )

  // Summary stats
  const total   = rows.length
  const present = rows.filter(r => r.status === 'present').length
  const late    = rows.filter(r => r.status === 'late').length
  const absent  = rows.filter(r => r.status === 'absent').length
  const totalHours = rows.reduce((sum, r) => sum + (parseFloat(r.hours_worked)||0), 0)

  return NextResponse.json({ data: rows, summary: { total, present, late, absent, totalHours: Math.round(totalHours*10)/10 } })
}
