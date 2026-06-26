'use client'
import { useEffect, useState } from 'react'
import { Users, FolderOpen, CheckCircle, Clock, AlertTriangle, LogOut } from 'lucide-react'
interface Stats {
  members: number; groups: number; today_present: number; today_total: number
  alerts: { full_name:string; member_no:string; group_name:string; status:string; time_in:string; time_out:string|null; shift_start:string; shift_end:string }[]
}
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const today = new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  useEffect(() => { fetch('/api/dashboard').then(r=>r.json()).then(setStats) }, [])

  const lateAlerts = stats?.alerts.filter(a => a.status === 'late') || []
  const noTimeOut  = stats?.alerts.filter(a => !a.time_out) || []

  const cards = [
    { label:'Total Members', value: stats?.members ?? '—', icon: Users, color:'bg-violet-500' },
    { label:'Departments', value: stats?.groups ?? '—', icon: FolderOpen, color:'bg-indigo-500' },
    { label:"Today's Present", value: stats ? `${stats.today_present}` : '—', icon: CheckCircle, color:'bg-emerald-500' },
    { label:'Total Logged', value: stats?.today_total ?? '—', icon: Clock, color:'bg-amber-500' },
  ]

  const fmt = (t:string) => t?.slice(0,5) || '—'
  const fmtTime = (t:string) => t ? new Date(t).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : '—'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">{today}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`${color} p-2.5 rounded-lg`}><Icon size={20} className="text-white" /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {stats && (lateAlerts.length > 0 || noTimeOut.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {lateAlerts.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500"/>
                <h2 className="font-semibold text-gray-800 text-sm">Late Today ({lateAlerts.length})</h2>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lateAlerts.map((a,i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.full_name}</p>
                      <p className="text-xs text-gray-400">{a.group_name} · Shift {fmt(a.shift_start)}</p>
                    </div>
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                      IN {fmtTime(a.time_in)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {noTimeOut.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <LogOut size={16} className="text-red-400"/>
                <h2 className="font-semibold text-gray-800 text-sm">No Time Out ({noTimeOut.length})</h2>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {noTimeOut.map((a,i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.full_name}</p>
                      <p className="text-xs text-gray-400">{a.group_name} · Shift ends {fmt(a.shift_end)}</p>
                    </div>
                    <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                      IN {fmtTime(a.time_in)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/attendance" className="block w-full bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 text-center">Take Attendance</a>
            <a href="/members" className="block w-full bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 text-center">Manage Members</a>
            <a href="/schedules" className="block w-full bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 text-center">Upload Schedule</a>
            <a href="/reports" className="block w-full bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 text-center">View Reports</a>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Attendance Rate Today</h2>
          {stats && stats.today_total > 0 ? (
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900">{Math.round((stats.today_present / stats.today_total)*100)}%</span>
                <span className="text-sm text-gray-400 mb-1">{stats.today_present}/{stats.today_total}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width:`${(stats.today_present/stats.today_total)*100}%` }} />
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Present: {stats.alerts ? stats.today_present - lateAlerts.length : stats.today_present}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Late: {lateAlerts.length}</span>
              </div>
            </div>
          ) : <p className="text-gray-400 text-sm">No records yet today</p>}
        </div>
      </div>
    </div>
  )
}
