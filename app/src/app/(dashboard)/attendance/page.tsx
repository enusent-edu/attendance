'use client'
import { useEffect, useState, useRef } from 'react'
import { Camera, QrCode, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
interface Group { id:string; name:string; attendance_method:string }
interface Log { id:string; status:string; time_in:string; method:string; members:{full_name:string;member_no:string}; groups:{name:string} }
const STATUS_COLORS: Record<string,string> = { present:'bg-emerald-100 text-emerald-700', late:'bg-amber-100 text-amber-700', absent:'bg-red-100 text-red-700', excused:'bg-blue-100 text-blue-700' }
export default function AttendancePage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [mode, setMode] = useState<'face'|'qr'>('face')
  const [logs, setLogs] = useState<Log[]>([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ok:boolean;msg:string}|null>(null)
  const [processing, setProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream|null>(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(()=>{
    fetch('/api/groups').then(r=>r.json()).then(d=>{ setGroups(d.data||[]); if(d.data?.length) setSelectedGroup(d.data[0].id) })
  },[])
  useEffect(()=>{ if(selectedGroup) loadLogs() },[selectedGroup])

  async function loadLogs() {
    const r = await fetch(`/api/attendance?date=${today}&group_id=${selectedGroup}`)
    const d = await r.json(); setLogs(d.data||[])
  }
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:640, height:480 } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setScanning(true); setResult(null)
    } catch { setResult({ok:false,msg:'Camera access denied'}) }
  }
  function stopCamera() { streamRef.current?.getTracks().forEach(t=>t.stop()); setScanning(false) }
  async function capture() {
    if (!videoRef.current || !selectedGroup) return
    setProcessing(true); setResult(null)
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const image = canvas.toDataURL('image/jpeg', 0.85)
    const r = await fetch('/api/face/identify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image, group_id: selectedGroup }) })
    const d = await r.json()
    if (!r.ok) { setResult({ok:false,msg:d.error||'Error'}); setProcessing(false); return }
    if (d.matched && d.member) {
      // Determine status based on time
      const now = new Date()
      const hour = now.getHours()
      const status = hour < 8 ? 'present' : hour < 9 ? 'late' : 'present'
      await fetch('/api/attendance', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ member_id: d.member.id, group_id: selectedGroup, method:'face', status }) })
      setResult({ok:true, msg:`✓ ${d.member.full_name} — ${status.toUpperCase()} (${Math.round(d.distance*100)}% confidence)`})
      loadLogs()
    } else {
      setResult({ok:false, msg:'Face not recognized. Please try again or enroll.'})
    }
    setProcessing(false)
  }

  const present = logs.filter(l=>l.status==='present'||l.status==='late').length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <button onClick={loadLogs} className="text-gray-400 hover:text-gray-600"><RefreshCw size={16}/></button>
      </div>
      <p className="text-gray-400 text-sm mb-5">{new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>

      {/* Group + Mode selector */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white">
          {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={()=>{setMode('face');stopCamera()}} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode==='face'?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
            <Camera size={14}/>Face
          </button>
          <button onClick={()=>{setMode('qr');stopCamera()}} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode==='qr'?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
            <QrCode size={14}/>QR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Scanner panel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">{mode==='face'?'Face Scanner':'QR Scanner'}</h2>
          {mode==='face' && (
            <>
              {!scanning ? (
                <button onClick={startCamera} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 w-full justify-center">
                  <Camera size={16}/>Start Camera
                </button>
              ) : (
                <div className="space-y-3">
                  <video ref={videoRef} autoPlay muted className="w-full rounded-lg bg-black aspect-video object-cover"/>
                  <div className="flex gap-2">
                    <button onClick={capture} disabled={processing} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                      {processing?'Processing...':'Capture & Identify'}
                    </button>
                    <button onClick={stopCamera} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Stop</button>
                  </div>
                </div>
              )}
            </>
          )}
          {mode==='qr' && (
            <div className="border-2 border-dashed border-violet-200 rounded-xl p-8 text-center">
              <QrCode size={40} className="text-violet-300 mx-auto mb-2"/>
              <p className="text-sm text-gray-400">QR scanner — point member&apos;s ID at camera</p>
              <p className="text-xs text-gray-300 mt-1">html5-qrcode integration</p>
            </div>
          )}
          {result && (
            <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-sm font-medium ${result.ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
              {result.ok ? <CheckCircle size={16} className="mt-0.5 shrink-0"/> : <XCircle size={16} className="mt-0.5 shrink-0"/>}
              {result.msg}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Today&apos;s Summary</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{present}</p>
              <p className="text-xs text-emerald-600">Present</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{logs.length}</p>
              <p className="text-xs text-gray-500">Total Logged</p>
            </div>
          </div>
          {logs.length > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-violet-500 h-1.5 rounded-full" style={{width:`${(present/logs.length)*100}%`}}/>
            </div>
          )}
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">Today&apos;s Logs ({logs.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            {['Member','Group','Time In','Method','Status'].map(h=>(
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length===0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">No records yet</td></tr>
            : logs.map(l=>(
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
    </div>
  )
}
