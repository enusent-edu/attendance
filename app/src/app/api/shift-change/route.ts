import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // pending | approved | rejected | all
  let q = `SELECT scr.*,
             m.full_name, m.member_no,
             g.name as group_name,
             u.full_name as reviewed_by_name
           FROM attendance.shift_change_requests scr
           JOIN attendance.members m ON m.id=scr.member_id
           JOIN attendance.groups g ON g.id=scr.group_id
           LEFT JOIN attendance.users u ON u.id=scr.reviewed_by
           WHERE scr.org_id=$1`
  const params: string[] = [s.org_id]
  if (status && status !== 'all') { params.push(status); q += ` AND scr.status=$${params.length}` }
  q += ` ORDER BY scr.created_at DESC LIMIT 100`
  const { rows } = await db.query(q, params)
  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { member_id, group_id, date, new_shift_start, new_shift_end, reason } = await req.json()
  if (!member_id || !group_id || !date || !new_shift_start || !new_shift_end)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Get current shift (member_schedules override or group default)
  const { rows: schedRows } = await db.query(
    `SELECT shift_start, shift_end FROM attendance.member_schedules WHERE member_id=$1 AND date=$2 LIMIT 1`,
    [member_id, date]
  )
  let old_shift_start, old_shift_end
  if (schedRows.length) {
    old_shift_start = schedRows[0].shift_start
    old_shift_end = schedRows[0].shift_end
  } else {
    const { rows: grpRows } = await db.query(
      `SELECT shift_start, shift_end FROM attendance.groups WHERE id=$1`, [group_id]
    )
    old_shift_start = grpRows[0]?.shift_start
    old_shift_end = grpRows[0]?.shift_end
  }

  const { rows } = await db.query(
    `INSERT INTO attendance.shift_change_requests
       (org_id,member_id,group_id,date,old_shift_start,old_shift_end,new_shift_start,new_shift_end,reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [s.org_id, member_id, group_id, date, old_shift_start, old_shift_end, new_shift_start, new_shift_end, reason||null]
  )

  // Notify HR
  const { rows: mRows } = await db.query(`SELECT full_name FROM attendance.members WHERE id=$1`, [member_id])
  await db.query(
    `INSERT INTO attendance.notifications (org_id,type,title,body,ref_id)
     VALUES ($1,'shift_change_request',$2,$3,$4)`,
    [s.org_id,
     `Shift Change Request: ${mRows[0]?.full_name}`,
     `${date} · ${new_shift_start.slice(0,5)}–${new_shift_end.slice(0,5)} · ${reason||'No reason given'}`,
     rows[0].id]
  )

  return NextResponse.json({ data: rows[0] }, { status: 201 })
}

export async function PUT(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await req.json() // action: 'approve' | 'reject'
  if (!['approve','reject'].includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const status = action === 'approve' ? 'approved' : 'rejected'
  const { rows } = await db.query(
    `UPDATE attendance.shift_change_requests
     SET status=$2, reviewed_by=$3, reviewed_at=now()
     WHERE id=$1 AND org_id=$4 RETURNING *`,
    [id, status, s.id, s.org_id]
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const req2 = rows[0]

  if (action === 'approve') {
    // Upsert into member_schedules
    await db.query(
      `INSERT INTO attendance.member_schedules (org_id,member_id,group_id,date,shift_start,shift_end,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (member_id,date) DO UPDATE SET shift_start=EXCLUDED.shift_start, shift_end=EXCLUDED.shift_end`,
      [s.org_id, req2.member_id, req2.group_id, req2.date, req2.new_shift_start, req2.new_shift_end, s.id]
    )
  }

  // Notify result
  const { rows: mRows } = await db.query(`SELECT full_name FROM attendance.members WHERE id=$1`, [req2.member_id])
  await db.query(
    `INSERT INTO attendance.notifications (org_id,type,title,body,ref_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [s.org_id,
     action === 'approve' ? 'shift_change_approved' : 'shift_change_rejected',
     `Shift Change ${action === 'approve' ? 'Approved' : 'Rejected'}: ${mRows[0]?.full_name}`,
     `${req2.date} · ${req2.new_shift_start?.slice(0,5)}–${req2.new_shift_end?.slice(0,5)}`,
     req2.id]
  )

  return NextResponse.json({ data: rows[0] })
}
