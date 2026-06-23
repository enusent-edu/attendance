import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export async function GET() {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rows } = await db.query(
    `SELECT id,name,description,attendance_method,created_at FROM attendance.groups WHERE org_id=$1 ORDER BY name`,
    [s.org_id]
  )
  return NextResponse.json({ data: rows })
}
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, description, attendance_method } = await req.json()
  const { rows } = await db.query(
    `INSERT INTO attendance.groups (org_id,name,description,attendance_method) VALUES ($1,$2,$3,$4) RETURNING *`,
    [s.org_id, name, description, attendance_method || 'face']
  )
  return NextResponse.json({ data: rows[0] }, { status: 201 })
}
