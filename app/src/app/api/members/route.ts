import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const q = new URL(req.url).searchParams.get('q') || ''
  const { rows } = await db.query(
    `SELECT id,member_no,full_name,email,phone,meta,photo_url,face_encoding,qr_code,is_active,created_at
     FROM attendance.members WHERE org_id=$1 ${q ? "AND full_name ILIKE $2" : ""}
     ORDER BY full_name`,
    q ? [s.org_id, `%${q}%`] : [s.org_id]
  )
  return NextResponse.json({ data: rows })
}
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const qr_code = `ATT-${Date.now()}`
  const { rows } = await db.query(
    `INSERT INTO attendance.members (org_id,member_no,full_name,email,phone,meta,photo_url,qr_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [s.org_id, body.member_no, body.full_name, body.email, body.phone, body.meta||{}, body.photo_url, qr_code]
  )
  return NextResponse.json({ data: rows[0] }, { status: 201 })
}
