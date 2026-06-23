const API = process.env.DEEPFACE_API_URL || 'http://attendance-deepface:5001'
export async function enrollFace(image: string): Promise<number[]> {
  const r = await fetch(`${API}/enroll`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Enroll failed')
  return d.encoding
}
export async function identifyFace(image: string, candidates: { id: string; encoding: number[] }[]): Promise<{ matched_id: string|null; distance: number }> {
  const r = await fetch(`${API}/identify`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image, candidates }) })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Identify failed')
  return d
}
