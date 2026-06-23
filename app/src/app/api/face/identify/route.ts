import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { image, group_id, multi = false } = await req.json()

  const { rows } = await db.query(
    `SELECT m.id,m.full_name,m.member_no,m.photo_url,m.face_encoding
     FROM attendance.member_groups mg
     JOIN attendance.members m ON m.id=mg.member_id
     WHERE mg.group_id=$1 AND m.face_encoding IS NOT NULL`,
    [group_id]
  )
  if (!rows.length) return NextResponse.json({ error: 'No enrolled faces in this group' }, { status: 400 })

  const candidates = rows.map(m => ({ id: m.id, encoding: m.face_encoding }))
  const endpoint = multi ? '/identify-multi' : '/identify'

  try {
    const deepfaceUrl = process.env.DEEPFACE_API_URL || 'http://attendance-deepface:5001'
    const r = await fetch(`${deepfaceUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, candidates })
    })
    const data = await r.json()
    if (!r.ok) return NextResponse.json({ error: data.error || 'DeepFace error' }, { status: 400 })

    if (multi) {
      // Enrich results with member info
      const results = (data.results || []).map((result: {matched_id: string; distance: number; face_index: number; facial_area: object}) => ({
        ...result,
        member: rows.find(m => m.id === result.matched_id)
      }))
      return NextResponse.json({ results, faces_detected: data.faces_detected })
    } else {
      if (!data.matched_id) return NextResponse.json({ matched: false, distance: data.distance })
      const member = rows.find(m => m.id === data.matched_id)
      return NextResponse.json({ matched: true, member, distance: data.distance })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Identify failed' }, { status: 400 })
  }
}
