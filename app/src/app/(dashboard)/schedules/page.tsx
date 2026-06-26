'use client'
import { useEffect, useState, useRef } from 'react'
import { Upload, Download, Trash2, Calendar, X, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Schedule { id:string; member_no:string; full_name:string; group_name:string; date:string; shift_start:string; shift_end:string }
interface Group { id:string; name:string }

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,7))
  const [groupFilter, setGroupFilter] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{inserted:number;errors:string[]}|null>(null)
  const [preview, setPreview] = useState<{member_no:string;date:string;shift_start:string;shift_end:string;group_id:string}[]|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ month })
    if (groupFilter) params.set('group_id', groupFilter)
    const r = await fetch(`/api/schedules?${params}`)
    const d = await r.json()
    setSchedules(d.data||[])
    setLoading(false)
  }

  useEffect(() => { fetch('/api/groups').then(r=>r.json()).then(d=>setGroups(d.data||[])) }, [])
  useEffect(() => { load() }, [month, groupFilter])

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['member_no','date','shift_start','shift_end','group_id'],
      ['001','2026-07-01','08:00','17:00', groups[0]?.id||''],
      ['002','2026-07-01','06:00','14:00', groups[0]?.id||''],
    ])
    ws['!cols'] = [{wch:12},{wch:12},{wch:12},{wch:12},{wch:40}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Schedules')
    XLSX.writeFile(wb, `schedule_template_${month}.xlsx`)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type:'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string,string>>(ws, { raw:false })
      const parsed = rows.map(r => ({
        member_no: String(r.member_no||r['Member No']||'').trim(),
        date: String(r.date||r['Date']||'').trim(),
        shift_start: String(r.shift_start||r['Shift Start']||'').trim(),
        shift_end: String(r.shift_end||r['Shift End']||'').trim(),
        group_id: String(r.group_id||r['Group ID']||'').trim(),
      })).filter(r => r.member_no && r.date)
      setPreview(parsed)
      setUploadResult(null)
    }
    reader.readAsBinaryString(file)
  }

  async function confirmUpload() {
    if (!preview) return
    setUploading(true)
    const r = await fetch('/api/schedules', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ schedules: preview }) })
    const d = await r.json()
    setUploadResult(d); setUploading(false); setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  async function deleteSchedule(id: string) {
    await fetch('/api/schedules', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    load()
  }

  const fmt = (t:string) => t?.slice(0,5) || '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="text-xs text-gray-400 mt-0.5">Upload monthly schedule · Overrides group default shift per member</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            <Download size={14}/>Template
          </button>
          <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
            <Upload size={14}/>Upload Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${uploadResult.errors.length ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
          {uploadResult.errors.length ? <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0"/> : <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0"/>}
          <div>
            <p className="text-sm font-medium">{uploadResult.inserted} schedule(s) imported successfully.</p>
            {uploadResult.errors.map((e,i)=><p key={i} className="text-xs text-red-500 mt-0.5">{e}</p>)}
          </div>
          <button onClick={()=>setUploadResult(null)} className="ml-auto"><X size={15} className="text-gray-400"/></button>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Preview — {preview.length} rows</h2>
              <button onClick={()=>{setPreview(null); if(fileRef.current) fileRef.current.value=''}}><X size={18} className="text-gray-400"/></button>
            </div>
            <div className="overflow-auto flex-1 mb-4">
              <table className="w-full text-xs">
                <thead className="bg-gray-50"><tr>
                  {['Member No','Date','Shift Start','Shift End','Group ID'].map(h=>(
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.slice(0,50).map((r,i)=>(
                    <tr key={i} className={!r.group_id ? 'bg-amber-50' : ''}>
                      <td className="px-3 py-1.5 font-mono">{r.member_no}</td>
                      <td className="px-3 py-1.5">{r.date}</td>
                      <td className="px-3 py-1.5">{r.shift_start}</td>
                      <td className="px-3 py-1.5">{r.shift_end}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-400 truncate max-w-[120px]">{r.group_id||<span className="text-amber-500">missing</span>}</td>
                    </tr>
                  ))}
                  {preview.length > 50 && <tr><td colSpan={5} className="px-3 py-2 text-gray-400 text-center">...and {preview.length-50} more rows</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{setPreview(null); if(fileRef.current) fileRef.current.value=''}} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmUpload} disabled={uploading} className="flex-1 bg-violet-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {uploading ? 'Uploading...' : `Confirm Upload (${preview.length} rows)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400"/>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
        </div>
        <select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">All Departments</option>
          {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Schedule table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            {['Member No','Name','Group','Date','Shift Start','Shift End',''].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            : schedules.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No schedules for {month}. Upload an Excel file to get started.</td></tr>
            : schedules.map(s=>(
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.member_no}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{s.full_name}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{s.group_name}</td>
                <td className="px-4 py-2.5 text-gray-700">{new Date(s.date).toLocaleDateString('en-PH',{month:'short',day:'numeric',weekday:'short'})}</td>
                <td className="px-4 py-2.5 text-gray-700">{fmt(s.shift_start)}</td>
                <td className="px-4 py-2.5 text-gray-700">{fmt(s.shift_end)}</td>
                <td className="px-4 py-2.5">
                  <button onClick={()=>deleteSchedule(s.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
