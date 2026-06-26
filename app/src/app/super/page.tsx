'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Check, XCircle, Building2, Users, FolderOpen, Activity, LogOut, Edit2, Power } from 'lucide-react'

interface Org {
  id:string; name:string; slug:string; contact_email:string|null
  plan:string; max_members:number; is_active:boolean; notes:string|null
  user_count:number; member_count:number; group_count:number; last_activity:string|null
  created_at:string
}

const PLAN_COLORS: Record<string,string> = {
  basic:      'bg-gray-100 text-gray-600',
  standard:   'bg-blue-100 text-blue-700',
  premium:    'bg-violet-100 text-violet-700',
  enterprise: 'bg-amber-100 text-amber-700',
}

const BLANK_ORG = { org_name:'', slug:'', contact_email:'', plan:'basic', max_members:50, admin_email:'', admin_name:'', admin_password:'', notes:'' }
const BLANK_EDIT = { id:'', name:'', contact_email:'', plan:'basic', max_members:50, is_active:true, notes:'' }

export default function SuperAdminPage() {
  const router = useRouter()
  const [orgs, setOrgs]         = useState<Org[]>([])
  const [loading, setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm]         = useState({ ...BLANK_ORG })
  const [editForm, setEditForm] = useState({ ...BLANK_EDIT })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ok:boolean;text:string}|null>(null)
  const [user, setUser]         = useState<{full_name:string;role:string}|null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/login'); return null }
      return r.json()
    }).then(d => {
      if (d && d.user?.role !== 'super_admin') { router.push('/dashboard'); return }
      d && setUser(d.user)
    })
  }, [router])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/super')
    if (!r.ok) { router.push('/login'); return }
    const d = await r.json(); setOrgs(d.data||[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createOrg(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    const r = await fetch('/api/super', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    const d = await r.json(); setSaving(false)
    if (r.ok) {
      setMsg({ok:true, text:`✓ Org "${d.org.name}" created. Admin: ${d.user.email}`})
      setShowCreate(false); setForm({...BLANK_ORG}); load()
    } else setMsg({ok:false, text:d.error||'Failed'})
  }

  async function updateOrg(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    const r = await fetch('/api/super', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(editForm) })
    const d = await r.json(); setSaving(false)
    if (r.ok) { setMsg({ok:true,text:'✓ Updated'}); setShowEdit(false); load() }
    else setMsg({ok:false, text:d.error||'Failed'})
  }

  async function toggleActive(org: Org) {
    await fetch('/api/super', { method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...org, is_active: !org.is_active }) })
    load()
  }

  function openEdit(org: Org) {
    setEditForm({ id:org.id, name:org.name, contact_email:org.contact_email||'',
      plan:org.plan, max_members:org.max_members, is_active:org.is_active, notes:org.notes||'' })
    setShowEdit(true)
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
  }

  async function logout() {
    await fetch('/api/auth/logout', { method:'POST' }); router.push('/login')
  }

  const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'
  const fmtTs   = (d:string) => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : 'Never'

  const totalOrgs    = orgs.length
  const activeOrgs   = orgs.filter(o=>o.is_active).length
  const totalMembers = orgs.reduce((s,o)=>s+Number(o.member_count),0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-violet-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-sm">📋</div>
          <div>
            <p className="font-bold text-sm">AttendTrack</p>
            <p className="text-violet-400 text-xs">Super Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-violet-300 text-xs hidden sm:block">{user?.full_name}</p>
          <button onClick={logout} className="flex items-center gap-1.5 text-violet-300 hover:text-white text-xs">
            <LogOut size={14}/>Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label:'Total Orgs',    val:totalOrgs,   icon:Building2, color:'bg-violet-500' },
            { label:'Active Orgs',   val:activeOrgs,  icon:Activity,  color:'bg-emerald-500' },
            { label:'Total Members', val:totalMembers,icon:Users,     color:'bg-indigo-500' },
          ].map(({ label, val, icon:Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`${color} p-2.5 rounded-lg`}><Icon size={18} className="text-white"/></div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message */}
        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
            {msg.ok?<Check size={15}/>:<XCircle size={15}/>}{msg.text}
            <button onClick={()=>setMsg(null)} className="ml-auto"><X size={14}/></button>
          </div>
        )}

        {/* Org list header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Organizations ({orgs.length})</h2>
          <button onClick={()=>{setShowCreate(true);setMsg(null)}}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus size={15}/>New Organization
          </button>
        </div>

        {/* Org cards */}
        {loading ? <p className="text-gray-400 text-sm text-center py-10">Loading...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map(org => (
              <div key={org.id} className={`bg-white rounded-xl border shadow-sm p-5 ${!org.is_active?'opacity-60 border-gray-100':'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[org.plan]||PLAN_COLORS.basic}`}>
                        {org.plan.toUpperCase()}
                      </span>
                      {!org.is_active && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">INACTIVE</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">/{org.slug}</p>
                    {org.contact_email && <p className="text-xs text-gray-400">{org.contact_email}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={()=>openEdit(org)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Edit2 size={14}/>
                    </button>
                    <button onClick={()=>toggleActive(org)}
                      className={`p-1.5 rounded-lg text-sm ${org.is_active?'hover:bg-red-50 text-gray-400 hover:text-red-500':'hover:bg-emerald-50 text-gray-400 hover:text-emerald-500'}`}>
                      <Power size={14}/>
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { icon:Users,      val:org.user_count,   label:'Users' },
                    { icon:Users,      val:org.member_count, label:'Members' },
                    { icon:FolderOpen, val:org.group_count,  label:'Groups' },
                  ].map(({ icon:Icon, val, label }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="font-bold text-gray-800 text-sm">{val||0}</p>
                      <p className="text-[10px] text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Max {org.max_members} members</span>
                  <span>Last activity: {fmtTs(org.last_activity||'')}</span>
                  <span>Since {fmtDate(org.created_at)}</span>
                </div>
                {org.notes && <p className="text-xs text-gray-400 mt-2 italic border-t border-gray-50 pt-2">{org.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Org Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Organization</h2>
              <button onClick={()=>setShowCreate(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={createOrg} className="space-y-3">
              <div className="border-b border-gray-100 pb-3 mb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Organization</p>
                <input required placeholder="Org Name (e.g. Acme Corp)" value={form.org_name}
                  onChange={e=>setForm(f=>({...f,org_name:e.target.value,slug:autoSlug(e.target.value)}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 mb-2"/>
                <input required placeholder="Slug (e.g. acme-corp)" value={form.slug}
                  onChange={e=>setForm(f=>({...f,slug:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 mb-2"/>
                <input type="email" placeholder="Contact Email (optional)" value={form.contact_email}
                  onChange={e=>setForm(f=>({...f,contact_email:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 mb-2"/>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <input type="number" placeholder="Max Members" value={form.max_members}
                    onChange={e=>setForm(f=>({...f,max_members:parseInt(e.target.value)||50}))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
                </div>
                <textarea placeholder="Notes (optional)" value={form.notes} rows={2}
                  onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none mt-2"/>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Admin Account</p>
                <input type="email" required placeholder="Admin Email" value={form.admin_email}
                  onChange={e=>setForm(f=>({...f,admin_email:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 mb-2"/>
                <input placeholder="Admin Full Name" value={form.admin_name}
                  onChange={e=>setForm(f=>({...f,admin_name:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 mb-2"/>
                <input required type="password" placeholder="Admin Password" value={form.admin_password}
                  onChange={e=>setForm(f=>({...f,admin_password:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving?'Creating...':'Create Org'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Org Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Edit Organization</h2>
              <button onClick={()=>setShowEdit(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={updateOrg} className="space-y-3">
              <input required placeholder="Org Name" value={editForm.name}
                onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <input type="email" placeholder="Contact Email" value={editForm.contact_email}
                onChange={e=>setEditForm(f=>({...f,contact_email:e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <div className="grid grid-cols-2 gap-2">
                <select value={editForm.plan} onChange={e=>setEditForm(f=>({...f,plan:e.target.value}))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <input type="number" placeholder="Max Members" value={editForm.max_members}
                  onChange={e=>setEditForm(f=>({...f,max_members:parseInt(e.target.value)||50}))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              </div>
              <textarea placeholder="Notes" value={editForm.notes} rows={2}
                onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"/>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={editForm.is_active}
                  onChange={e=>setEditForm(f=>({...f,is_active:e.target.checked}))}
                  className="rounded"/>
                Active
              </label>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setShowEdit(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving?'Saving...':'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
