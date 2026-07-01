import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import AdminUsers from './components/AdminUsers'
import { getMyProfile, type Profile } from './lib/admin'
import type { Session } from '@supabase/supabase-js'
import GeneratorView from './views/GeneratorView'
import LeadsView from './views/LeadsView'
import DashboardView from './views/DashboardView'
import RecommendationsView from './views/RecommendationsView'
import ContentView from './views/ContentView'
import ScoringView from './views/ScoringView'
import MarketView from './views/MarketView'
import ApprovalView from './views/ApprovalView'

type View = 'leads' | 'content' | 'dashboard' | 'recommend' | 'generate' | 'market' | 'scoring' | 'review'

const NAV: [View, string][] = [
  ['leads', '📥 Leads'],
  ['review', '✅ Review'],
  ['content', '📈 Content'],
  ['dashboard', '📊 CPQL / Sales'],
  ['recommend', '🧠 This Week'],
  ['market', '🔎 Market'],
  ['generate', '✍️ Generate'],
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const [view, setView] = useState<View>('leads')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); setProfileReady(false); return }
    setProfileReady(false)
    getMyProfile().then((p) => { setProfile(p); setProfileReady(true) }).catch(() => setProfileReady(true))
  }, [session])

  if (!authReady) return null
  if (!session) return <Login />
  if (!profileReady) return null
  if (!profile || profile.status !== 'approved') {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 420, margin: '80px auto', padding: '0 18px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20 }}>Account {profile?.status ?? 'pending'}</h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          {profile?.status === 'rejected'
            ? 'Your access request was declined by the owner.'
            : 'Your account is pending owner approval. You will get access once approved.'}
        </p>
        <p style={{ color: '#999', fontSize: 12 }}>{session.user.email}</p>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '8px 16px', cursor: 'pointer' }}>Sign out</button>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '28px auto', padding: '0 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ marginBottom: 2 }}>Super Marketing Brain</h1>
        <span style={{ fontSize: 12, color: '#999' }}>
          {session.user.email}{' '}
          <button onClick={() => supabase.auth.signOut()} style={{ marginLeft: 6, fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}>Sign out</button>
        </span>
      </div>
      <p style={{ color: '#777', marginTop: 0, fontSize: 13 }}>Attention → quality leads → appointments → sales → learn.</p>

      {profile.role === 'owner' && <AdminUsers />}

      <nav style={{ display: 'flex', gap: 6, borderBottom: '1px solid #eee', margin: '14px 0 18px' }}>
        {(profile.role === 'owner' ? [...NAV, ['scoring', '⚙️ Scoring'] as [View, string]] : NAV).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '8px 14px', cursor: 'pointer', border: 'none', background: 'transparent',
              borderBottom: view === v ? '2px solid #111' : '2px solid transparent',
              fontWeight: view === v ? 700 : 400, fontSize: 14,
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {view === 'leads' && <LeadsView />}
      {view === 'review' && <ApprovalView />}
      {view === 'content' && <ContentView />}
      {view === 'dashboard' && <DashboardView />}
      {view === 'recommend' && <RecommendationsView />}
      {view === 'generate' && <GeneratorView />}
      {view === 'market' && <MarketView />}
      {view === 'scoring' && profile.role === 'owner' && <ScoringView />}
    </main>
  )
}
