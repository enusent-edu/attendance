import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rows } = await db.query(
    `SELECT * FROM attendance.notifications WHERE org_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [s.org_id]
  )
  const unread = rows.filter(r => !r.is_read).length
  return NextResponse.json({ data: rows, unread })
}

export async function PUT(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (id === 'all') {
    await db.query(`UPDATE attendance.notifications SET is_read=true WHERE org_id=$1`, [s.org_id])
  } else {
    await db.query(`UPDATE attendance.notifications SET is_read=true WHERE id=$1 AND org_id=$2`, [id, s.org_id])
  }
  return NextResponse.json({ ok: true })
}
