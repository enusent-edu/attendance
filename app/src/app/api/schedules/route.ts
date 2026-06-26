import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM
  const group_id = searchParams.get('group_id')
  let q = `SELECT ms.*, m.full_name, m.member_no, g.name as group_name
            FROM attendance.member_schedules ms
            JOIN attendance.members m ON m.id=ms.member_id
            JOIN attendance.groups g ON g.id=ms.group_id
            WHERE ms.org_id=$1`
  const params: (string)[] = [s.org_id]
  if (month) { params.push(month); q += ` AND to_char(ms.date,'YYYY-MM')=$${params.length}` }
  if (group_id) { params.push(group_id); q += ` AND ms.group_id=$${params.length}` }
  q += ` ORDER BY ms.date, m.full_name`
  const { rows } = await db.query(q, params)
  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { schedules } = await req.json()
  // schedules: [{ member_no, date, shift_start, shift_end, group_id }]
  let inserted = 0, errors: string[] = []
  for (const row of schedules) {
    try {
      // Resolve member_no → member_id
      const { rows: mRows } = await db.query(
        `SELECT id FROM attendance.members WHERE member_no=$1 AND org_id=$2`,
        [row.member_no, s.org_id]
      )
      if (!mRows.length) { errors.push(`Member not found: ${row.member_no}`); continue }
      await db.query(
        `INSERT INTO attendance.member_schedules (org_id,member_id,group_id,date,shift_start,shift_end,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (member_id,date) DO UPDATE SET shift_start=EXCLUDED.shift_start, shift_end=EXCLUDED.shift_end`,
        [s.org_id, mRows[0].id, row.group_id, row.date, row.shift_start, row.shift_end, s.id]
      )
      inserted++
    } catch (e: unknown) {
      errors.push(`Row ${row.member_no}/${row.date}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }
  return NextResponse.json({ inserted, errors })
}

export async function DELETE(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await db.query(`DELETE FROM attendance.member_schedules WHERE id=$1 AND org_id=$2`, [id, s.org_id])
  return NextResponse.json({ ok: true })
}
