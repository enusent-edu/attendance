import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { qr_code } = await req.json()
  const { rows } = await db.query(
    `SELECT id,full_name,member_no FROM attendance.members WHERE qr_code=$1 AND org_id=$2 AND is_active=true LIMIT 1`,
    [qr_code, s.org_id]
  )
  if (!rows[0]) return NextResponse.json({ error: 'QR code not recognized' }, { status: 404 })
  return NextResponse.json({ member: rows[0] })
}
