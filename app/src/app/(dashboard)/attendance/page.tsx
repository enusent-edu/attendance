'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Camera, QrCode, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react'
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
  const [realtime, setRealtime] = useState(false)
  const realtimeRef = useRef(false)
  const cooldownRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream|null>(null)
  const qrScannerRef = useRef<unknown>(null)
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
      setScanning(true); setResult(null)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(()=>{})
        }
      }, 150)
    } catch { setResult({ok:false,msg:'Camera access denied'}) }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t=>t.stop())
    setScanning(false)
  }

  const stopQr = useCallback(() => {
    if (qrScannerRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (qrScannerRef.current as any).stop().catch(()=>{})
      qrScannerRef.current = null
    }
    setScanning(false)
  }, [])

  async function startQr() {
    setScanning(true); setResult(null)
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode('qr-reader')
        qrScannerRef.current = scanner
        await scanner.start(
          { facingMode:'environment' },
          { fps:10, qrbox:{ width:250, height:250 } },
          async (qrCode: string) => {
            await scanner.stop(); qrScannerRef.current = null; setScanning(false)
            setProcessing(true); setResult(null)
            const r = await fetch('/api/attendance/qr', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ qr_code:qrCode, group_id:selectedGroup }) })
            const d = await r.json(); setProcessing(false)
            if (!r.ok) { setResult({ok:false,msg:d.error||'QR Error'}); return }
            const hour = new Date().getHours()
            const status = hour < 8 ? 'present' : hour < 9 ? 'late' : 'present'
            await fetch('/api/attendance', { method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ member_id:d.member.id, group_id:selectedGroup, method:'qr', status }) })
            setResult({ok:true, msg:`✓ ${d.member.full_name} — ${status.toUpperCase()} (QR)`}); loadLogs()
          },
          ()=>{}
        )
      } catch { setResult({ok:false,msg:'QR scanner error'}); setScanning(false) }
    }, 100)
  }

  async function capture() {
    if (!videoRef.current || !selectedGroup) return
    setProcessing(true); setResult(null)
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const image = canvas.toDataURL('image/jpeg', 0.85)
    const r = await fetch('/api/face/identify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image, group_id:selectedGroup }) })
    const d = await r.json()
    if (!r.ok) { setResult({ok:false,msg:d.error||'Error'}); setProcessing(false); return }
    if (d.matched && d.member) {
      const hour = new Date().getHours()
      const status = hour < 8 ? 'present' : hour < 9 ? 'late' : 'present'
      await fetch('/api/attendance', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ member_id:d.member.id, group_id:selectedGroup, method:'face', status }) })
      setResult({ok:true, msg:`✓ ${d.member.full_name} — ${status.toUpperCase()} (${Math.round(d.distance*100)}% match)`})
      loadLogs()
    } else {
      setResult({ok:false, msg:'Face not recognized. Try again or enroll.'})
    }
    setProcessing(false)
    cooldownRef.current = false
  }

  function toggleRealtime() {
    if (!realtime) {
      setRealtime(true); realtimeRef.current = true
      if (!scanning) startCamera()
    } else {
      setRealtime(false); realtimeRef.current = false
      stopCamera()
    }
  }

  // Realtime loop — auto-capture on blink
  useEffect(() => {
    if (!realtime) return
    const interval = setInterval(() => {
      if (!cooldownRef.current && realtimeRef.current && videoRef.current && !processing) {
        cooldownRef.current = true
        captureMulti()
      }
    }, 500)
    return () => clearInterval(interval)
  }, [realtime])

  const present = logs.filter(l=>l.status==='present'||l.status==='late').length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <button onClick={loadLogs} className="text-gray-400 hover:text-gray-600"><RefreshCw size={16}/></button>
      </div>
      <p className="text-gray-400 text-sm mb-5">{new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>

      <div className="flex flex-wrap gap-3 mb-5">
        <select value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white">
          {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={()=>{setMode('face');stopCamera();stopQr()}} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode==='face'?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
            <Camera size={14}/>Face
          </button>
          <button onClick={()=>{setMode('qr');stopCamera()}} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode==='qr'?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
            <QrCode size={14}/>QR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">{mode==='face'?'Face Scanner':'QR Scanner'}</h2>
          {mode==='face' && (
            <>
              {!scanning ? (
                <div className="space-y-2">
                  <button onClick={startCamera} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 w-full justify-center">
                    <Camera size={16}/>Start Camera (Manual)
                  </button>
                  <button onClick={toggleRealtime} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 w-full justify-center">
                    <Eye size={16}/>Start Real-time Detection
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video object-cover"/>
                    {realtime && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>}
                  </div>
                  <div className="flex gap-2">
                    {!realtime && <button onClick={capture} disabled={processing}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
                      {processing?'Processing...':'Capture & Identify'}
                    </button>}
                    <button onClick={()=>{stopCamera();setRealtime(false);realtimeRef.current=false}} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Stop</button>
                  </div>
                </div>
              )}
            </>
          )}
          {mode==='qr' && (
            <>
              {!scanning ? (
                <button onClick={startQr} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 w-full justify-center">
                  <QrCode size={16}/>Start QR Scanner
                </button>
              ) : (
                <div className="space-y-3">
                  <div id="qr-reader" className="w-full rounded-lg overflow-hidden"/>
                  <button onClick={stopQr} className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Stop</button>
                </div>
              )}
            </>
          )}
          {result && (
            <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-sm font-medium ${result.ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
              {result.ok ? <CheckCircle size={16} className="mt-0.5 shrink-0"/> : <XCircle size={16} className="mt-0.5 shrink-0"/>}
              {result.msg}
            </div>
          )}
        </div>

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
