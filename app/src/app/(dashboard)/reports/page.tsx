'use client'
import { useState } from 'react'
import { Download, Search } from 'lucide-react'
interface Log { id:string; date:string; status:string; method:string; time_in:string; members:{full_name:string;member_no:string}; groups:{name:string} }
const STATUS_COLORS: Record<string,string> = { present:'bg-emerald-100 text-emerald-700', late:'bg-amber-100 text-amber-700', absent:'bg-red-100 text-red-700', excused:'bg-blue-100 text-blue-700' }
export default function ReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  async function load() {
    setLoading(true); setSearched(true)
    const r = await fetch(`/api/attendance?date=${date}`)
    const d = await r.json(); setLogs(d.data||[]); setLoading(false)
  }
  function exportCSV() {
    const rows = [['Date','Member','Group','Time In','Method','Status'],
      ...logs.map(l=>[l.date, l.members?.full_name, l.groups?.name, l.time_in?new Date(l.time_in).toLocaleTimeString():'', l.method, l.status])]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv)
    a.download = `attendance-${date}.csv`; a.click()
  }
  const present = logs.filter(l=>l.status==='present'||l.status==='late').length
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
          </div>
          <button onClick={load} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
            <Search size={14}/>Generate
          </button>
          {logs.length>0 && (
            <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Download size={14}/>Export CSV
            </button>
          )}
        </div>
      </div>
      {searched && (
        <>
          {logs.length>0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{label:'Total',val:logs.length,c:'text-gray-900'},{label:'Present',val:present,c:'text-emerald-600'},{label:'Late/Others',val:logs.length-present,c:'text-amber-600'}]
                .map(x=>(
                  <div key={x.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className={`text-2xl font-bold ${x.c}`}>{x.val}</p>
                    <p className="text-xs text-gray-400">{x.label}</p>
                  </div>
                ))}
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                {['Member','Group','Time In','Method','Status'].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading?<tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading...</td></tr>
                :logs.length===0?<tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No records for {date}</td></tr>
                :logs.map(l=>(
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{l.members?.full_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{l.groups?.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{l.time_in?new Date(l.time_in).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}):'—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 capitalize text-xs">{l.method}</td>
                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status]||''}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
