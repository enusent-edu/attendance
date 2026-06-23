'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, FolderOpen, ClipboardCheck, BarChart3, LogOut, Menu } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/groups', label: 'Groups', icon: FolderOpen },
  { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (!r.ok) { router.push('/login'); return null } return r.json() })
      .then(d => d && setUser(d.user))
  }, [router])

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
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-gray-600"><Menu size={20} /></button>
          <span className="font-semibold text-gray-800 text-sm">AttendTrack</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
