import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { identifyFace } from '@/lib/deepface'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const s = getSession(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { image, group_id } = await req.json()
  const db = supabaseAdmin()
  const { data: memberships } = await db.schema('attendance').from('member_groups')
    .select('members(id,full_name,member_no,photo_url,face_encoding)').eq('group_id', group_id)
  const candidates = (memberships||[])
    .map((m: Record<string,unknown>) => m.members as { id:string; full_name:string; member_no:string; photo_url:string; face_encoding:number[]|null })
    .filter(m => m?.face_encoding)
    .map(m => ({ id: m.id, encoding: m.face_encoding as number[] }))
  if (!candidates.length) return NextResponse.json({ error: 'No enrolled faces in this group' }, { status: 400 })
  try {
    const result = await identifyFace(image, candidates)
    if (!result.matched_id) return NextResponse.json({ matched: false, distance: result.distance })
    const member = (memberships||[])
      .map((m: Record<string,unknown>) => m.members as { id:string; full_name:string; member_no:string; photo_url:string })
      .find(m => m?.id === result.matched_id)
    return NextResponse.json({ matched: true, member, distance: result.distance })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Identify failed' }, { status: 400 })
  }
}
