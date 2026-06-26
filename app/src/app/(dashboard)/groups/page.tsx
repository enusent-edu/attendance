'use client'
import { useEffect, useState } from 'react'
import { Plus, X, Users, UserPlus, Trash2, Clock } from 'lucide-react'
interface Group { id:string; name:string; description:string; attendance_method:string; shift_start:string; shift_end:string; grace_minutes:number; timeout_gap_hours:number; created_at:string }
interface Member { id:string; full_name:string; member_no:string; has_face:boolean }
interface AllMember { id:string; full_name:string; member_no:string }
const METHOD_LABELS: Record<string,string> = { face:'Face Only', qr:'QR Only', both:'Face + QR', manual:'Manual' }
const METHOD_COLORS: Record<string,string> = { face:'bg-violet-100 text-violet-700', qr:'bg-amber-100 text-amber-700', both:'bg-blue-100 text-blue-700', manual:'bg-gray-100 text-gray-600' }

const SHIFT_PRESETS = [
  { label:'7AM – 4PM', start:'07:00', end:'16:00' },
  { label:'8AM – 5PM (Office)', start:'08:00', end:'17:00' },
  { label:'6AM – 2PM', start:'06:00', end:'14:00' },
  { label:'2PM – 10PM', start:'14:00', end:'22:00' },
  { label:'10PM – 6AM', start:'22:00', end:'06:00' },
  { label:'Custom', start:'', end:'' },
]

const BLANK_FORM = { name:'', description:'', attendance_method:'face', shift_preset:'8AM – 5PM (Office)', shift_start:'08:00', shift_end:'17:00', grace_minutes:15, timeout_gap_hours:4 }

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editGroup, setEditGroup] = useState<Group|null>(null)
  const [form, setForm] = useState({ ...BLANK_FORM })
  const [saving, setSaving] = useState(false)
  const [manageGroup, setManageGroup] = useState<Group|null>(null)
  const [groupMembers, setGroupMembers] = useState<Member[]>([])
  const [allMembers, setAllMembers] = useState<AllMember[]>([])
  const [addingMember, setAddingMember] = useState('')

  async function load() {
    setLoading(true); const r = await fetch('/api/groups'); const d = await r.json()
    setGroups(d.data||[]); setLoading(false)
  }
  useEffect(()=>{ load() },[])

  function applyPreset(label: string) {
    const p = SHIFT_PRESETS.find(s => s.label === label)
    if (p && p.start) setForm(f => ({ ...f, shift_preset: label, shift_start: p.start, shift_end: p.end }))
    else setForm(f => ({ ...f, shift_preset: label }))
  }

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    if (editGroup) {
      await fetch('/api/groups', { method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: editGroup.id, ...form }) })
    } else {
      await fetch('/api/groups', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form) })
    }
    setSaving(false); setShowAdd(false); setEditGroup(null); setForm({ ...BLANK_FORM }); load()
  }

  function openEdit(g: Group) {
    const preset = SHIFT_PRESETS.find(p => p.start === g.shift_start?.slice(0,5) && p.end === g.shift_end?.slice(0,5))
    setForm({
      name: g.name, description: g.description||'', attendance_method: g.attendance_method,
      shift_preset: preset?.label || 'Custom',
      shift_start: g.shift_start?.slice(0,5) || '08:00',
      shift_end: g.shift_end?.slice(0,5) || '17:00',
      grace_minutes: g.grace_minutes || 15,
      timeout_gap_hours: g.timeout_gap_hours || 4,
    })
    setEditGroup(g); setShowAdd(true)
  }

  async function openManage(g: Group) {
    setManageGroup(g); setAddingMember('')
    const [gm, am] = await Promise.all([
      fetch(`/api/groups/${g.id}/members`).then(r=>r.json()),
      fetch('/api/members').then(r=>r.json())
    ])
    setGroupMembers(gm.data||[])
    setAllMembers(am.data||[])
  }

  async function assignMember() {
    if (!manageGroup || !addingMember) return
    await fetch(`/api/groups/${manageGroup.id}/members`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({member_id:addingMember})})
    setAddingMember(''); openManage(manageGroup)
  }

  async function removeMember(member_id: string) {
    if (!manageGroup) return
    await fetch(`/api/groups/${manageGroup.id}/members`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({member_id})})
    openManage(manageGroup)
  }

  const unassigned = allMembers.filter(m => !groupMembers.find(gm=>gm.id===m.id))
  const fmt = (t:string) => t ? t.slice(0,5) : '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button onClick={()=>{ setEditGroup(null); setForm({...BLANK_FORM}); setShowAdd(true) }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
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
            {g.description && <p className="text-xs text-gray-400 mb-2">{g.description}</p>}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
              <Clock size={11}/>
              <span>{fmt(g.shift_start)} – {fmt(g.shift_end)}</span>
              <span className="text-gray-300">·</span>
              <span>{g.grace_minutes||15}min grace</span>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>openManage(g)} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium">
                <Users size={13}/>Members
              </button>
              <button onClick={()=>openEdit(g)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Group Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editGroup ? 'Edit Group' : 'Add Group'}</h2>
              <button onClick={()=>{ setShowAdd(false); setEditGroup(null) }}><X size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={saveGroup} className="space-y-3">
              <input required placeholder="Group Name (e.g. Grade 7-A, Morning Shift)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <input placeholder="Description (optional)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <select value={form.attendance_method} onChange={e=>setForm({...form,attendance_method:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                <option value="face">Face Only</option>
                <option value="qr">QR Only</option>
                <option value="both">Face + QR</option>
                <option value="manual">Manual</option>
              </select>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Shift Schedule</p>
                <select value={form.shift_preset} onChange={e=>applyPreset(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 mb-2">
                  {SHIFT_PRESETS.map(p=><option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Shift Start</label>
                    <input type="time" value={form.shift_start} onChange={e=>setForm({...form,shift_start:e.target.value,shift_preset:'Custom'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Shift End</label>
                    <input type="time" value={form.shift_end} onChange={e=>setForm({...form,shift_end:e.target.value,shift_preset:'Custom'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Grace Period (min)</label>
                    <input type="number" min={0} max={60} value={form.grace_minutes} onChange={e=>setForm({...form,grace_minutes:parseInt(e.target.value)||0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Time Out Gap (hrs)</label>
                    <input type="number" min={1} max={12} value={form.timeout_gap_hours} onChange={e=>setForm({...form,timeout_gap_hours:parseInt(e.target.value)||4})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>{ setShowAdd(false); setEditGroup(null) }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editGroup ? 'Save Changes' : 'Add Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {manageGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{manageGroup.name} — Members</h2>
              <button onClick={()=>setManageGroup(null)}><X size={18} className="text-gray-400"/></button>
            </div>
            {unassigned.length > 0 && (
              <div className="flex gap-2 mb-4">
                <select value={addingMember} onChange={e=>setAddingMember(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Select member to add...</option>
                  {unassigned.map(m=><option key={m.id} value={m.id}>{m.full_name} ({m.member_no})</option>)}
                </select>
                <button onClick={assignMember} disabled={!addingMember} className="flex items-center gap-1 bg-violet-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-40">
                  <UserPlus size={14}/>Add
                </button>
              </div>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {groupMembers.length === 0
                ? <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
                : groupMembers.map(m=>(
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.full_name}</p>
                      <p className="text-xs text-gray-400">{m.member_no} · {m.has_face ? '✓ Face enrolled':'No face'}</p>
                    </div>
                    <button onClick={()=>removeMember(m.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
