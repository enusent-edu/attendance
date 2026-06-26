import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'
export const dynamic = 'force-dynamic'

function isSuperAdmin() {
  const s = getSession()
  if (!s || s.role !== 'super_admin') return null
  return s
}

// GET /api/super — list all orgs with stats
export async function GET() {
  if (!isSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { rows } = await db.query(`
    SELECT o.*,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role != 'super_admin') as user_count,
      COUNT(DISTINCT m.id) as member_count,
      COUNT(DISTINCT g.id) as group_count,
      MAX(l.created_at) as last_activity
    FROM attendance.orgs o
    LEFT JOIN attendance.users u ON u.org_id=o.id
    LEFT JOIN attendance.members m ON m.org_id=o.id
    LEFT JOIN attendance.groups g ON g.org_id=o.id
    LEFT JOIN attendance.logs l ON l.org_id=o.id
    GROUP BY o.id ORDER BY o.created_at DESC
  `)
  return NextResponse.json({ data: rows })
}

// POST /api/super — create org + admin user
export async function POST(req: Request) {
  if (!isSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { org_name, slug, contact_email, plan, max_members, admin_email, admin_name, admin_password, notes } = await req.json()
  if (!org_name || !slug || !admin_email || !admin_password)
    return NextResponse.json({ error: 'org_name, slug, admin_email, admin_password required' }, { status: 400 })

  // Check slug unique
  const { rows: existing } = await db.query(`SELECT id FROM attendance.orgs WHERE slug=$1`, [slug])
  if (existing.length) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  // Create org
  const { rows: orgRows } = await db.query(
    `INSERT INTO attendance.orgs (name, slug, contact_email, plan, max_members, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [org_name, slug, contact_email||null, plan||'basic', max_members||50, notes||null]
  )
  const org = orgRows[0]

  // Create admin user
  const hash = crypto.createHash('sha256').update(admin_password).digest('hex')
  const { rows: userRows } = await db.query(
    `INSERT INTO attendance.users (org_id, email, full_name, role, password_hash)
     VALUES ($1,$2,$3,'admin',$4) RETURNING id, email, full_name, role`,
    [org.id, admin_email, admin_name||admin_email, hash]
  )

  return NextResponse.json({ org, user: userRows[0] }, { status: 201 })
}

// PUT /api/super — update org
export async function PUT(req: Request) {
  if (!isSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, name, contact_email, plan, max_members, is_active, notes } = await req.json()
  const { rows } = await db.query(
    `UPDATE attendance.orgs SET name=$2, contact_email=$3, plan=$4, max_members=$5, is_active=$6, notes=$7
     WHERE id=$1 RETURNING *`,
    [id, name, contact_email, plan, max_members, is_active, notes]
  )
  return NextResponse.json({ data: rows[0] })
}

// DELETE /api/super — deactivate org (soft delete)
export async function DELETE(req: Request) {
  if (!isSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  await db.query(`UPDATE attendance.orgs SET is_active=false WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
