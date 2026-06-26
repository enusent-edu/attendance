import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rows } = await db.query(
    `SELECT id,name,description,attendance_method,shift_start,shift_end,grace_minutes,timeout_gap_hours,created_at
     FROM attendance.groups WHERE org_id=$1 ORDER BY name`,
    [s.org_id]
  )
  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, description, attendance_method, shift_start, shift_end, grace_minutes, timeout_gap_hours } = await req.json()
  const { rows } = await db.query(
    `INSERT INTO attendance.groups (org_id,name,description,attendance_method,shift_start,shift_end,grace_minutes,timeout_gap_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [s.org_id, name, description, attendance_method||'face',
     shift_start||'08:00', shift_end||'17:00', grace_minutes||15, timeout_gap_hours||4]
  )
  return NextResponse.json({ data: rows[0] }, { status: 201 })
}

export async function PUT(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, name, description, attendance_method, shift_start, shift_end, grace_minutes, timeout_gap_hours } = await req.json()
  const { rows } = await db.query(
    `UPDATE attendance.groups SET name=$2,description=$3,attendance_method=$4,shift_start=$5,shift_end=$6,grace_minutes=$7,timeout_gap_hours=$8
     WHERE id=$1 AND org_id=$9 RETURNING *`,
    [id, name, description, attendance_method, shift_start, shift_end, grace_minutes, timeout_gap_hours, s.org_id]
  )
  return NextResponse.json({ data: rows[0] })
}
