'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'Login failed'); setLoading(false); return }
    router.push('/dashboard')
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AttendTrack</h1>
          <p className="text-gray-400 text-sm mt-1">Smart Attendance System</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="Email"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Password"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">admin@attendance.demo · admin123</p>
      </div>
    </div>
  )
}
