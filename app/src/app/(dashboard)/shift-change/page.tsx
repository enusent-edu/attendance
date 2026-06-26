'use client'
import { useEffect, useState } from 'react'
import { Plus, X, Check, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface Request {
  id:string; member_id:string; group_id:string; date:string
  full_name:string; member_no:string; group_name:string
  old_shift_start:string; old_shift_end:string
  new_shift_start:string; new_shift_end:string
  reason:string|null; status:string
  reviewed_by_name:string|null; reviewed_at:string|null; created_at:string
}
interface Member { id:string; full_name:string; member_no:string }
interface Group  { id:string; name:string; shift_start:string; shift_end:string }

const STATUS_COLORS: Record<string,string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const SHIFT_PRESETS = [
  { label:'7AM – 4PM',          start:'07:00', end:'16:00' },
  { label:'8AM – 5PM (Office)', start:'08:00', end:'17:00' },
  { label:'6AM – 2PM',          start:'06:00', end:'14:00' },
  { label:'2PM – 10PM',         start:'14:00', end:'22:00' },
  { label:'10PM – 6AM',         start:'22:00', end:'06:00' },
  { label:'Custom',             start:'',      end:''      },
]

const BLANK = { member_id:'', group_id:'', date:'', preset:'8AM – 5PM (Office)', new_shift_start:'08:00', new_shift_end:'17:00', reason:'' }

export default function ShiftChangePage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [members, setMembers]   = useState<Member[]>([])
  const [groups, setGroups]     = useState<Group[]>([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ...BLANK })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ok:boolean;text:string}|null>(null)
  const [expanded, setExpanded] = useState<string|null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/shift-change?status=${statusFilter}`)
    const d = await r.json(); setRequests(d.data||[]); setLoading(false)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then(r=>r.json()).then(d=>setMembers(d.data||[])),
      fetch('/api/groups').then(r=>r.json()).then(d=>setGroups(d.data||[])),
    ])
  }, [])
  useEffect(() => { load() }, [statusFilter])

  function applyPreset(label: string) {
    const p = SHIFT_PRESETS.find(s=>s.label===label)
    if (p?.start) setForm(f=>({...f, preset:label, new_shift_start:p.start, new_shift_end:p.end}))
    else setForm(f=>({...f, preset:label}))
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    const r = await fetch('/api/shift-change', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ member_id:form.member_id, group_id:form.group_id, date:form.date,
        new_shift_start:form.new_shift_start, new_shift_end:form.new_shift_end, reason:form.reason })
    })
    const d = await r.json(); setSaving(false)
    if (r.ok) { setMsg({ok:true,text:'Request submitted — HR will be notified.'}); setShowForm(false); setForm({...BLANK}); load() }
    else setMsg({ok:false,text:d.error||'Failed to submit'})
  }

  async function review(id: string, action: 'approve'|'reject') {
    await fetch('/api/shift-change', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, action })
    })
    load()
  }

  const fmt    = (t:string) => t?.slice(0,5) || '—'
  const fmtDt  = (t:string) => t ? new Date(t).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'
  const fmtTs  = (t:string) => t ? new Date(t).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

  // Auto-fill group when member selected
  function handleMemberChange(member_id: string) {
    const g = groups[0]
    setForm(f=>({...f, member_id, group_id: g?.id||'' }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Change Requests</h1>
          <p className="text-xs text-gray-400 mt-0.5">Submit and approve employee shift change requests</p>
        </div>
        <button onClick={()=>{setShowForm(true);setMsg(null)}}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
          <Plus size={16}/>New Request
        </button>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
          {msg.ok ? <Check size={15}/> : <XCircle size={15}/>}{msg.text}
          <button onClick={()=>setMsg(null)} className="ml-auto"><X size={14}/></button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
        {['pending','approved','rejected','all'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter===s?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-10">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No {statusFilter} requests</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{r.full_name}</p>
                      <span className="text-xs text-gray-400">{r.member_no}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.group_name} · {fmtDt(r.date)}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className="text-gray-400 line-through text-xs">{fmt(r.old_shift_start)}–{fmt(r.old_shift_end)}</span>
                      <span className="text-gray-300">→</span>
                      <span className="font-semibold text-violet-700">{fmt(r.new_shift_start)}–{fmt(r.new_shift_end)}</span>
                    </div>
                    {r.reason && <p className="text-xs text-gray-500 mt-1 italic">&quot;{r.reason}&quot;</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {r.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={()=>review(r.id,'approve')}
                          className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700">
                          <Check size={12}/>Approve
                        </button>
                        <button onClick={()=>review(r.id,'reject')}
                          className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">
                          <XCircle size={12}/>Reject
                        </button>
                      </div>
                    )}
                    <button onClick={()=>setExpanded(expanded===r.id?null:r.id)}
                      className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
                      {expanded===r.id?<ChevronUp size={12}/>:<ChevronDown size={12}/>}Details
                    </button>
                  </div>
                </div>
                {expanded===r.id && (
                  <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div><span className="font-medium text-gray-600">Submitted:</span> {fmtTs(r.created_at)}</div>
                    {r.reviewed_by_name && <div><span className="font-medium text-gray-600">Reviewed by:</span> {r.reviewed_by_name}</div>}
                    {r.reviewed_at && <div><span className="font-medium text-gray-600">Reviewed at:</span> {fmtTs(r.reviewed_at)}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Shift Change Request</h2>
              <button onClick={()=>setShowForm(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={submitRequest} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Member</label>
                <select required value={form.member_id} onChange={e=>handleMemberChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Select member...</option>
                  {members.map(m=><option key={m.id} value={m.id}>{m.full_name} ({m.member_no})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Group</label>
                <select required value={form.group_id} onChange={e=>setForm(f=>({...f,group_id:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Select group...</option>
                  {groups.map(g=><option key={g.id} value={g.id}>{g.name} ({fmt(g.shift_start)}–{fmt(g.shift_end)})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input required type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">New Shift</label>
                <select value={form.preset} onChange={e=>applyPreset(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 mb-2">
                  {SHIFT_PRESETS.map(p=><option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Start</label>
                    <input type="time" required value={form.new_shift_start}
                      onChange={e=>setForm(f=>({...f,new_shift_start:e.target.value,preset:'Custom'}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">End</label>
                    <input type="time" required value={form.new_shift_end}
                      onChange={e=>setForm(f=>({...f,new_shift_end:e.target.value,preset:'Custom'}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Reason <span className="text-gray-400">(optional)</span></label>
                <textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} rows={2}
                  placeholder="e.g. Medical appointment, family emergency..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"/>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving?'Submitting...':'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
