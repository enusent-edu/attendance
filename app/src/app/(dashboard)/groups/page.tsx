'use client'
import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
interface Group { id:string; name:string; description:string; attendance_method:string; created_at:string }
const METHOD_LABELS: Record<string,string> = { face:'Face Only', qr:'QR Only', both:'Face + QR', manual:'Manual' }
const METHOD_COLORS: Record<string,string> = { face:'bg-violet-100 text-violet-700', qr:'bg-amber-100 text-amber-700', both:'bg-blue-100 text-blue-700', manual:'bg-gray-100 text-gray-600' }
export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', description:'', attendance_method:'both' })
  const [saving, setSaving] = useState(false)
  async function load() {
    setLoading(true); const r = await fetch('/api/groups'); const d = await r.json()
    setGroups(d.data||[]); setLoading(false)
  }
  useEffect(()=>{ load() },[])
  async function addGroup(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch('/api/groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    setSaving(false); setShowAdd(false); setForm({name:'',description:'',attendance_method:'both'}); load()
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
          <Plus size={16}/>Add Group
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-gray-400 text-sm">Loading...</p>
        : groups.map(g=>(
          <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{g.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${METHOD_COLORS[g.attendance_method]}`}>
                {METHOD_LABELS[g.attendance_method]}
              </span>
            </div>
            {g.description && <p className="text-xs text-gray-400">{g.description}</p>}
            <p className="text-xs text-gray-300 mt-3">{new Date(g.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Group</h2>
              <button onClick={()=>setShowAdd(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={addGroup} className="space-y-3">
              <input required placeholder="Group Name (e.g. HR Dept, Grade 7-A, Morning Shift)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <input placeholder="Description (optional)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <select value={form.attendance_method} onChange={e=>setForm({...form,attendance_method:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                <option value="both">Face + QR</option>
                <option value="face">Face Only</option>
                <option value="qr">QR Only</option>
                <option value="manual">Manual</option>
              </select>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setShowAdd(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving?'Saving...':'Add Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
