'use client'
import { useEffect, useState } from 'react'
import { Download, Search, FileText, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

interface Log {
  id:string; date:string; status:string; method:string
  time_in:string; time_out:string|null; hours_worked:number|null; remarks:string|null
  full_name:string; member_no:string; group_name:string
  shift_start:string; shift_end:string
}
interface Summary { total:number; present:number; late:number; absent:number; totalHours:number }
interface Group  { id:string; name:string }
interface Member { id:string; full_name:string; member_no:string }

const STATUS_COLORS: Record<string,string> = {
  present:'bg-emerald-100 text-emerald-700',
  late:'bg-amber-100 text-amber-700',
  absent:'bg-red-100 text-red-700',
  excused:'bg-blue-100 text-blue-700',
}

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0,7)

export default function ReportsPage() {
  const [mode, setMode]           = useState<'daily'|'range'|'monthly'|'member'>('daily')
  const [dateFrom, setDateFrom]   = useState(today)
  const [dateTo, setDateTo]       = useState(today)
  const [month, setMonth]         = useState(thisMonth)
  const [groupId, setGroupId]     = useState('')
  const [memberId, setMemberId]   = useState('')
  const [groups, setGroups]       = useState<Group[]>([])
  const [members, setMembers]     = useState<Member[]>([])
  const [logs, setLogs]           = useState<Log[]>([])
  const [summary, setSummary]     = useState<Summary|null>(null)
  const [loading, setLoading]     = useState(false)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    fetch('/api/groups').then(r=>r.json()).then(d=>setGroups(d.data||[]))
    fetch('/api/members').then(r=>r.json()).then(d=>setMembers(d.data||[]))
  }, [])

  async function generate() {
    setLoading(true); setGenerated(true)
    const p = new URLSearchParams({ mode })
    if (mode === 'monthly')       p.set('month', month)
    else if (mode === 'daily')    p.set('date_from', dateFrom)
    else if (mode === 'range')  { p.set('date_from', dateFrom); p.set('date_to', dateTo) }
    else if (mode === 'member') { p.set('date_from', dateFrom); p.set('date_to', dateTo) }
    if (groupId)  p.set('group_id', groupId)
    if (memberId && mode === 'member') p.set('member_id', memberId)
    const r = await fetch(`/api/reports?${p}`)
    const d = await r.json()
    setLogs(d.data||[]); setSummary(d.summary||null); setLoading(false)
  }

  function exportCSV() {
    const headers = ['Date','Member No','Member','Group','Shift','Time In','Time Out','Hours Worked','Method','Status','Remarks']
    const rows = logs.map(l => [
      l.date,
      l.member_no,
      l.full_name,
      l.group_name,
      `${fmt(l.shift_start)}-${fmt(l.shift_end)}`,
      fmtTime(l.time_in),
      l.time_out ? fmtTime(l.time_out) : '',
      l.hours_worked != null ? parseFloat(String(l.hours_worked)).toFixed(2) : '',
      l.method,
      l.status,
      l.remarks||'',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const fname = mode==='monthly' ? `attendance_${month}.csv`
      : mode==='member' && memberId ? `attendance_member_${dateFrom}_${dateTo}.csv`
      : `attendance_${dateFrom}${dateFrom!==dateTo?'_to_'+dateTo:''}.csv`
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv)
    a.download = fname; a.click()
  }

  function exportMonthlySummary() {
    // Pivot: member rows × date columns
    const dates = Array.from(new Set(logs.map((l: Log)=>l.date))).sort()
    const memberMap: Record<string, Record<string,Log>> = {}
    logs.forEach(l => {
      if (!memberMap[l.member_no]) memberMap[l.member_no] = {}
      memberMap[l.member_no][l.date] = l
    })
    const headers = ['Member No','Member','Group', ...dates]
    const rows = Object.entries(memberMap).map(([mno, byDate]) => {
      const first = Object.values(byDate)[0]
      return [mno, first.full_name, first.group_name, ...dates.map(d => byDate[d]?.status||'absent')]
    })
    const csv = [headers, ...rows].map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv)
    a.download = `monthly_summary_${month}.csv`; a.click()
  }

  const fmt     = (t:string) => t?.slice(0,5)||'—'
  const fmtDate = (d:string) => new Date(d+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',weekday:'short'})
  const fmtTime = (t:string) => t ? new Date(t).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-400 mt-0.5">Attendance logs, summaries, and CSV export</p>
        </div>
        {logs.length > 0 && (
          <div className="flex gap-2">
            {mode === 'monthly' && (
              <button onClick={exportMonthlySummary}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                <FileText size={14}/>Monthly Summary
              </button>
            )}
            <button onClick={exportCSV}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
              <Download size={14}/>Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
        {/* Mode tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
          {([['daily','Daily'],['range','Date Range'],['monthly','Monthly'],['member','Per Member']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setMode(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode===v?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Date inputs */}
          {mode === 'daily' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
          )}
          {(mode === 'range' || mode === 'member') && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              </div>
            </>
          )}
          {mode === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
              <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
          )}

          {/* Group filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Group</label>
            <select value={groupId} onChange={e=>setGroupId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">All Groups</option>
              {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {/* Member filter (member mode only) */}
          {mode === 'member' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Member</label>
              <select value={memberId} onChange={e=>setMemberId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">All Members</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.full_name} ({m.member_no})</option>)}
              </select>
            </div>
          )}

          <button onClick={generate}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
            <Search size={14}/>Generate
          </button>
        </div>
      </div>

      {generated && (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
              {[
                { label:'Total Records', val:summary.total,        icon:Users,        color:'text-gray-700',    bg:'bg-gray-50' },
                { label:'Present',       val:summary.present,      icon:CheckCircle,  color:'text-emerald-700', bg:'bg-emerald-50' },
                { label:'Late',          val:summary.late,         icon:AlertTriangle,color:'text-amber-700',   bg:'bg-amber-50' },
                { label:'Absent',        val:summary.absent,       icon:AlertTriangle,color:'text-red-700',     bg:'bg-red-50' },
                { label:'Total Hours',   val:summary.totalHours+'h',icon:Clock,       color:'text-violet-700',  bg:'bg-violet-50' },
              ].map(({ label, val, icon:Icon, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
                  <Icon size={18} className={color}/>
                  <div>
                    <p className={`text-xl font-bold ${color}`}>{val}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date','Member','Group','Shift','Time In','Time Out','Hours','Method','Status'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No records found</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{fmtDate(l.date)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-900 text-xs">{l.full_name}</p>
                      <p className="text-gray-400 text-[10px]">{l.member_no}</p>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{l.group_name}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">{fmt(l.shift_start)}–{fmt(l.shift_end)}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-xs font-medium whitespace-nowrap">{fmtTime(l.time_in)}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {l.time_out
                        ? <span className="text-emerald-600 font-medium">{fmtTime(l.time_out)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">
                      {l.hours_worked != null ? `${parseFloat(String(l.hours_worked)).toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 capitalize text-xs">{l.method}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status]||'bg-gray-100 text-gray-500'}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length > 0 && (
            <p className="text-xs text-gray-400 mt-3 text-right">{logs.length} record{logs.length!==1?'s':''} · Click Export CSV to download</p>
          )}
        </>
      )}
    </div>
  )
}
