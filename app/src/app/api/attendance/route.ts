import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const group_id = searchParams.get('group_id')
  const { rows } = await db.query(
    `SELECT l.id,l.date,l.time_in,l.time_out,l.method,l.status,l.remarks,
            json_build_object('id',m.id,'full_name',m.full_name,'member_no',m.member_no,'photo_url',m.photo_url) as members,
            json_build_object('name',g.name) as groups
     FROM attendance.logs l
     JOIN attendance.members m ON m.id=l.member_id
     JOIN attendance.groups g ON g.id=l.group_id
     WHERE l.org_id=$1 AND l.date=$2 ${group_id ? 'AND l.group_id=$3' : ''}
     ORDER BY l.time_in DESC`,
    group_id ? [s.org_id, date, group_id] : [s.org_id, date]
  )
  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const now = new Date()
  const date = body.date || now.toISOString().split('T')[0]
  const time_in = body.time_in || now.toISOString()

  // Get shift for this member/group/date (member_schedules override first, then group default)
  const { rows: schedRows } = await db.query(
    `SELECT shift_start, shift_end FROM attendance.member_schedules
     WHERE member_id=$1 AND date=$2 LIMIT 1`,
    [body.member_id, date]
  )
  let shift_start: string, shift_end: string, grace_minutes: number, timeout_gap_hours: number
  if (schedRows.length) {
    shift_start = schedRows[0].shift_start
    shift_end = schedRows[0].shift_end
    grace_minutes = 15
    timeout_gap_hours = 4
  } else {
    const { rows: grpRows } = await db.query(
      `SELECT shift_start, shift_end, grace_minutes, timeout_gap_hours FROM attendance.groups WHERE id=$1`,
      [body.group_id]
    )
    shift_start = grpRows[0]?.shift_start || '08:00:00'
    shift_end   = grpRows[0]?.shift_end   || '17:00:00'
    grace_minutes = grpRows[0]?.grace_minutes || 15
    timeout_gap_hours = grpRows[0]?.timeout_gap_hours || 4
  }

  // Compute status from shift + grace
  function computeStatus(ts: Date, shiftStart: string): string {
    const [sh, sm] = shiftStart.split(':').map(Number)
    const deadline = new Date(ts)
    deadline.setHours(sh, sm + grace_minutes, 0, 0)
    return ts <= deadline ? 'present' : 'late'
  }

  const timeInDate = new Date(time_in)
  const status = body.status || computeStatus(timeInDate, shift_start)

  // Check if existing log exists (for time_out logic)
  const { rows: existing } = await db.query(
    `SELECT id, time_in, time_out FROM attendance.logs WHERE member_id=$1 AND date=$2`,
    [body.member_id, date]
  )

  let result
  if (existing.length && existing[0].time_in && !existing[0].time_out) {
    // Second scan — check if gap is enough for time_out
    const prevTimeIn = new Date(existing[0].time_in)
    const gapHours = (timeInDate.getTime() - prevTimeIn.getTime()) / 3600000
    if (gapHours >= timeout_gap_hours) {
      // Log time_out
      const { rows } = await db.query(
        `UPDATE attendance.logs SET time_out=$1 WHERE member_id=$2 AND date=$3 RETURNING *`,
        [time_in, body.member_id, date]
      )
      result = { ...rows[0], action: 'timeout' }
      // Notification: no issues needed for time_out
    } else {
      // Too soon — ignore, return existing
      return NextResponse.json({ data: existing[0], action: 'too_soon', gap_hours: Math.round(gapHours * 10) / 10 })
    }
  } else if (existing.length && existing[0].time_out) {
    // Already has time_out — ignore duplicate
    return NextResponse.json({ data: existing[0], action: 'already_complete' })
  } else {
    // New time_in
    const { rows } = await db.query(
      `INSERT INTO attendance.logs (org_id,member_id,group_id,date,time_in,method,status,remarks,recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (member_id,date) DO NOTHING
       RETURNING *`,
      [s.org_id, body.member_id, body.group_id, date, time_in, body.method, status, body.remarks, s.id]
    )
    result = { ...rows[0], action: 'timein' }

    // Create late notification
    if (status === 'late') {
      const { rows: mRows } = await db.query(
        `SELECT full_name FROM attendance.members WHERE id=$1`, [body.member_id]
      )
      const { rows: gRows } = await db.query(
        `SELECT name FROM attendance.groups WHERE id=$1`, [body.group_id]
      )
      await db.query(
        `INSERT INTO attendance.notifications (org_id,type,title,body,ref_id)
         VALUES ($1,'late',$2,$3,$4)`,
        [s.org_id,
         `Late: ${mRows[0]?.full_name}`,
         `Arrived late for ${gRows[0]?.name} — shift started ${shift_start.slice(0,5)}, grace ${grace_minutes}min`,
         rows[0]?.id]
      )
    }
  }

  return NextResponse.json({ data: result }, { status: 201 })
}
