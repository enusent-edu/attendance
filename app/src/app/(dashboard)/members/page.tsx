'use client'
import { useEffect, useState, useRef } from 'react'
import { Search, Plus, Camera, QrCode, X, Upload, Printer } from 'lucide-react'
interface Member { id:string; member_no:string; full_name:string; email:string; meta:Record<string,string>|null; face_encoding:number[]|null; qr_code:string; is_active:boolean }

// Dynamically load qrcode lib
async function generateQRDataURL(text: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(text, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [enrollId, setEnrollId] = useState<string|null>(null)
  const [enrollTab, setEnrollTab] = useState<'camera'|'upload'>('camera')
  const [form, setForm] = useState({ member_no:'', full_name:'', email:'', phone:'', meta: { position:'' } })
  const [saving, setSaving] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMsg, setEnrollMsg] = useState('')
  const [uploadPreview, setUploadPreview] = useState<string|null>(null)
  const [printMember, setPrintMember] = useState<Member|null>(null)
  const [printAll, setPrintAll] = useState(false)
  const [qrDataUrls, setQrDataUrls] = useState<Record<string,string>>({})
  const [generatingQR, setGeneratingQR] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/members?q=${q}`)
    const d = await r.json()
    setMembers(d.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [q])

  async function addMember(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch('/api/members', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    setSaving(false); setShowAdd(false); setForm({ member_no:'', full_name:'', email:'', phone:'', meta:{ position:'' } }); load()
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t=>t.stop())
    streamRef.current = null
  }

  async function startEnroll(memberId: string) {
    setEnrollId(memberId); setEnrollMsg(''); setEnrollTab('camera'); setUploadPreview(null)
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'user' } })
    streamRef.current = stream
    setTimeout(() => {
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(()=>{}) }
    }, 150)
  }

  function closeEnroll() { setEnrollId(null); setUploadPreview(null); setEnrollMsg(''); stopCamera() }

  function switchTab(tab: 'camera'|'upload') {
    setEnrollTab(tab); setEnrollMsg(''); setUploadPreview(null)
    if (tab === 'upload') { stopCamera() }
    else {
      navigator.mediaDevices.getUserMedia({ video: { facingMode:'user' } }).then(stream => {
        streamRef.current = stream
        setTimeout(() => {
          if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(()=>{}) }
        }, 150)
      })
    }
  }

  async function enrollWithImage(image: string) {
    setEnrolling(true); setEnrollMsg('')
    const r = await fetch('/api/face/enroll', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image, member_id: enrollId }) })
    const d = await r.json(); setEnrolling(false)
    if (r.ok) { setEnrollMsg('✓ Face enrolled successfully!'); stopCamera(); load() }
    else setEnrollMsg(`✗ ${d.error}`)
  }

  async function captureEnroll() {
    if (!videoRef.current || !enrollId) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    await enrollWithImage(canvas.toDataURL('image/jpeg', 0.85))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setUploadPreview(ev.target?.result as string); setEnrollMsg('') }
    reader.readAsDataURL(file)
  }

  async function enrollUpload() {
    if (!uploadPreview || !enrollId) return
    await enrollWithImage(uploadPreview)
  }

  // QR print — single
  async function openPrintSingle(m: Member) {
    setPrintMember(m); setGeneratingQR(true)
    const url = await generateQRDataURL(m.qr_code)
    setQrDataUrls(prev => ({ ...prev, [m.id]: url }))
    setGeneratingQR(false)
  }

  // QR print — bulk all
  async function openPrintAll() {
    setPrintAll(true); setGeneratingQR(true)
    const urls: Record<string,string> = {}
    for (const m of members) {
      urls[m.id] = await generateQRDataURL(m.qr_code)
    }
    setQrDataUrls(urls); setGeneratingQR(false)
  }

  function triggerPrint() {
    window.print()
  }

  const orgName = 'AttendTrack' // could be fetched from session later

  return (
    <>
    {/* Print styles */}
    <style>{`
      @media print {
        body > * { display: none !important; }
        #qr-print-area { display: flex !important; }
        #qr-print-area * { display: revert !important; }
      }
    `}</style>

    {/* Hidden print area */}
    <div id="qr-print-area" style={{display:'none'}}
      className="flex flex-wrap gap-4 p-4">
      {(printMember ? [printMember] : members).map(m => (
        qrDataUrls[m.id] ? (
          <div key={m.id} style={{
            width:'200px', border:'1px solid #e5e7eb', borderRadius:'8px',
            padding:'12px', textAlign:'center', pageBreakInside:'avoid',
            fontFamily:'sans-serif'
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrls[m.id]} alt={m.qr_code} style={{width:'160px',height:'160px',margin:'0 auto'}}/>
            <p style={{fontWeight:700,fontSize:'13px',marginTop:'6px',color:'#111'}}>{m.full_name}</p>
            <p style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>{m.member_no}</p>
            <p style={{fontSize:'10px',color:'#9ca3af',marginTop:'2px'}}>{m.qr_code}</p>
            <p style={{fontSize:'10px',color:'#9ca3af'}}>{orgName}</p>
          </div>
        ) : null
      ))}
    </div>

    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="flex gap-2">
          <button onClick={openPrintAll}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            <Printer size={15}/>Print All QR
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus size={16}/>Add Member
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search members..."
          className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-full sm:w-72 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['ID','Name','Email','Face','QR','Actions'].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            : members.length===0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No members found</td></tr>
            : members.map(m=>(
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.member_no}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.email||'—'}</td>
                <td className="px-4 py-3">{m.face_encoding
                  ? <span className="text-emerald-600 text-xs font-medium flex items-center gap-1"><Camera size={12}/>Enrolled</span>
                  : <span className="text-gray-300 text-xs">—</span>}</td>
                <td className="px-4 py-3">
                  <button onClick={()=>openPrintSingle(m)}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
                    <QrCode size={12}/>{m.qr_code?.slice(-8)}
                    <Printer size={11} className="text-gray-400 ml-1"/>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={()=>startEnroll(m.id)} className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded hover:bg-violet-100">
                    {m.face_encoding ? 'Re-enroll' : 'Enroll Face'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Member</h2>
              <button onClick={()=>setShowAdd(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <form onSubmit={addMember} className="space-y-3">
              <input required placeholder="Member No. / Employee ID" value={form.member_no} onChange={e=>setForm({...form,member_no:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <input required placeholder="Full Name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <input type="email" placeholder="Email (optional)" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <input placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <input placeholder="Position / Department (optional)" value={form.meta.position} onChange={e=>setForm({...form,meta:{position:e.target.value}})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500"/>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setShowAdd(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving?'Saving...':'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Face Enroll Modal */}
      {enrollId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Enroll Face</h2>
              <button onClick={closeEnroll}><X size={18} className="text-gray-400"/></button>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
              <button onClick={()=>switchTab('camera')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${enrollTab==='camera'?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
                <Camera size={13}/>Camera
              </button>
              <button onClick={()=>switchTab('upload')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${enrollTab==='upload'?'bg-white text-violet-700 shadow-sm':'text-gray-500'}`}>
                <Upload size={13}/>Upload Photo
              </button>
            </div>
            {enrollTab === 'camera' ? (
              <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black mb-3"/>
                {enrollMsg && <p className={`text-sm mb-3 font-medium ${enrollMsg.startsWith('✓')?'text-emerald-600':'text-red-500'}`}>{enrollMsg}</p>}
                <button onClick={captureEnroll} disabled={enrolling}
                  className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {enrolling?'Processing...':'Capture & Enroll'}
                </button>
              </>
            ) : (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
                {uploadPreview ? (
                  <div className="mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadPreview} alt="preview" className="w-full rounded-lg object-cover max-h-64"/>
                    <button onClick={()=>{setUploadPreview(null); setEnrollMsg(''); if(fileRef.current) fileRef.current.value=''}}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline">Change photo</button>
                  </div>
                ) : (
                  <button onClick={()=>fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-lg py-10 flex flex-col items-center gap-2 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors mb-3">
                    <Upload size={24}/>
                    <span className="text-sm font-medium">Click to upload photo</span>
                    <span className="text-xs">JPG, PNG — clear front-facing face</span>
                  </button>
                )}
                {enrollMsg && <p className={`text-sm mb-3 font-medium ${enrollMsg.startsWith('✓')?'text-emerald-600':'text-red-500'}`}>{enrollMsg}</p>}
                <button onClick={enrollUpload} disabled={enrolling || !uploadPreview}
                  className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {enrolling?'Processing...':'Enroll from Photo'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Single QR Print Preview Modal */}
      {printMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Print QR</h2>
              <button onClick={()=>setPrintMember(null)}><X size={18} className="text-gray-400"/></button>
            </div>
            {generatingQR ? (
              <p className="text-gray-400 text-sm py-8">Generating QR...</p>
            ) : qrDataUrls[printMember.id] ? (
              <>
                <div className="border border-gray-100 rounded-xl p-4 mb-4 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrls[printMember.id]} alt={printMember.qr_code} className="w-40 h-40 mx-auto"/>
                  <p className="font-bold text-gray-900 mt-2 text-sm">{printMember.full_name}</p>
                  <p className="text-xs text-gray-500">{printMember.member_no}</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{printMember.qr_code}</p>
                </div>
                <button onClick={triggerPrint}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700">
                  <Printer size={15}/>Print
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Bulk QR Print Preview Modal */}
      {printAll && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Print All QR Codes</h2>
              <button onClick={()=>setPrintAll(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            {generatingQR ? (
              <p className="text-gray-400 text-sm text-center py-8">Generating QR codes for {members.length} members...</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 max-h-80 overflow-y-auto mb-4 p-2">
                  {members.map(m => qrDataUrls[m.id] ? (
                    <div key={m.id} className="border border-gray-100 rounded-lg p-3 text-center w-36">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrls[m.id]} alt={m.qr_code} className="w-24 h-24 mx-auto"/>
                      <p className="font-semibold text-gray-900 text-xs mt-1 truncate">{m.full_name}</p>
                      <p className="text-gray-400 text-[10px]">{m.member_no}</p>
                    </div>
                  ) : null)}
                </div>
                <p className="text-xs text-gray-400 mb-3 text-center">{members.length} QR cards will be printed — each card fits on standard paper</p>
                <button onClick={triggerPrint}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700">
                  <Printer size={15}/>Print All ({members.length})
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
