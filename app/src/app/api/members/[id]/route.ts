import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const fields = Object.keys(body).filter(k => k !== 'id' && k !== 'org_id')
  const sets = fields.map((f, i) => `${f}=$${i + 3}`).join(',')
  const vals = fields.map(f => body[f])
  const { rows } = await db.query(
    `UPDATE attendance.members SET ${sets} WHERE id=$1 AND org_id=$2 RETURNING *`,
    [params.id, s.org_id, ...vals]
  )
  return NextResponse.json({ data: rows[0] })
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.query(`UPDATE attendance.members SET is_active=false WHERE id=$1 AND org_id=$2`, [params.id, s.org_id])
  return NextResponse.json({ ok: true })
}
