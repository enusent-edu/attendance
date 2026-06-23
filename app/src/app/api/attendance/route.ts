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
  const date = body.date || new Date().toISOString().split('T')[0]
  const time_in = body.time_in || new Date().toISOString()
  const { rows } = await db.query(
    `INSERT INTO attendance.logs (org_id,member_id,group_id,date,time_in,method,status,remarks,recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (member_id,date) DO UPDATE SET time_out=EXCLUDED.time_in, status=EXCLUDED.status
     RETURNING *`,
    [s.org_id, body.member_id, body.group_id, date, time_in, body.method, body.status||'present', body.remarks, s.id]
  )
  return NextResponse.json({ data: rows[0] }, { status: 201 })
}
