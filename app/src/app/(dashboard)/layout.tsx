'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, FolderOpen, ClipboardCheck, BarChart3, LogOut, Menu, Bell, Calendar, X, CheckCheck, Clock } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/groups', label: 'Departments', icon: FolderOpen },
  { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { href: '/schedules', label: 'Schedules', icon: Calendar },
  { href: '/shift-change', label: 'Shift Change', icon: Clock },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

interface Notif { id:string; type:string; title:string; body:string; is_read:boolean; created_at:string }

const TYPE_COLORS: Record<string,string> = {
  late: 'bg-amber-100 text-amber-700',
  no_timeout: 'bg-red-100 text-red-700',
  shift_change_request: 'bg-blue-100 text-blue-700',
  shift_change_approved: 'bg-emerald-100 text-emerald-700',
  shift_change_rejected: 'bg-gray-100 text-gray-600',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (!r.ok) { router.push('/login'); return null } return r.json() })
      .then(d => d && setUser(d.user))
  }, [router])

  async function loadNotifs() {
    const r = await fetch('/api/notifications')
    const d = await r.json()
    setNotifs(d.data || [])
    setUnread(d.unread || 0)
  }

  useEffect(() => { loadNotifs() }, [])
  useEffect(() => {
    const id = setInterval(loadNotifs, 30000)
    return () => clearInterval(id)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function markAll() {
    await fetch('/api/notifications', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id:'all' }) })
    loadNotifs()
  }

  async function markOne(id: string) {
    await fetch('/api/notifications', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    loadNotifs()
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {open && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-violet-950 text-white flex flex-col transition-transform lg:translate-x-0 lg:static ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-violet-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-500 rounded-lg flex items-center justify-center text-lg">📋</div>
            <div>
              <p className="font-bold text-sm">AttendTrack</p>
              <p className="text-violet-300 text-xs">{user?.role || '...'}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === href ? 'bg-violet-600 text-white' : 'text-violet-200 hover:bg-violet-800'}`}>
              <Icon size={17} />{label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-violet-800">
          <p className="text-xs text-violet-400 px-3 mb-1 truncate">{user?.full_name}</p>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-violet-200 hover:bg-violet-800 w-full">
            <LogOut size={17} />Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setOpen(true)} className="text-gray-600"><Menu size={20} /></button>
            <span className="font-semibold text-gray-800 text-sm">AttendTrack</span>
          </div>
          <div className="hidden lg:block" />
          {/* Bell */}
          <div ref={bellRef} className="relative">
            <button onClick={() => setShowNotifs(v => !v)}
              className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-semibold text-sm text-gray-800">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={markAll} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1">
                        <CheckCheck size={13}/>Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifs(false)}><X size={15} className="text-gray-400"/></button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifs.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                    : notifs.map(n => (
                      <div key={n.id} onClick={() => markOne(n.id)}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 shrink-0 ${TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-500'}`}>
                            {n.type.replace('_',' ').toUpperCase()}
                          </span>
                          {!n.is_read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"/>}
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-1">{n.title}</p>
                        {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
