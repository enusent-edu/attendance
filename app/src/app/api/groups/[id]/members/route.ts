import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rows } = await db.query(
    `SELECT m.id,m.full_name,m.member_no,m.face_encoding IS NOT NULL as has_face
     FROM attendance.member_groups mg
     JOIN attendance.members m ON m.id=mg.member_id
     WHERE mg.group_id=$1 ORDER BY m.full_name`,
    [params.id]
  )
  return NextResponse.json({ data: rows })
}
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { member_id } = await req.json()
  await db.query(
    `INSERT INTO attendance.member_groups (member_id,group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [member_id, params.id]
  )
  return NextResponse.json({ ok: true })
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { member_id } = await req.json()
  await db.query(`DELETE FROM attendance.member_groups WHERE member_id=$1 AND group_id=$2`, [member_id, params.id])
  return NextResponse.json({ ok: true })
}
