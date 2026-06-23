import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { enrollFace } from '@/lib/deepface'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { image, member_id } = await req.json()
  try {
    const encoding = await enrollFace(image)
    await db.query(
      `UPDATE attendance.members SET face_encoding=$1 WHERE id=$2 AND org_id=$3`,
      [JSON.stringify(encoding), member_id, s.org_id]
    )
    return NextResponse.json({ ok: true, message: 'Face enrolled successfully' })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Enroll failed' }, { status: 400 })
  }
}
