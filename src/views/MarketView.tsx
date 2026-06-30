import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Creator { handle: string; niche?: string; score?: number; notes?: string }
interface Viral { hook?: string; format?: string; why_worked?: string; metrics?: any }

// Concise, evidence-tagged teardown (full detail in research memory). Reference, refresh periodically.
const RENO_COMPETITORS = [
  ['Qanvast', 'Budget-number hook + standout feature + named ID; engineered for SAVES+SHARES (live: shares>likes). Viral 2024: ryokan 3-rm BTO 3M views.'],
  ['EZiD (Ryan Tan)', 'Creator-led (NOC audience) + always-on paid w/ Advanced Matching → CPA −25.7%. IDs pay sub + done-for-you video.'],
  ['Renopedia', 'Omnichannel volume (TikTok/IG/YouTube "Renotube"/Telegram/FB), 1M+ visits, retargeting.'],
  ['Lemonfridge Studio', 'Owns ONE aesthetic ("Home of Japandi"), 77K IG — category king for that look.'],
  ['ourfookinhouse', 'Real-homeowner authenticity, $25K reno, ~6.5% ER on a tiny following — relatability beats polish.'],
]
const MARKET_FACTS = [
  'SG reno 2026: 4-rm BTO ~S$25-40k / resale ~S$56-81k; big MOP wave late-2026 → resale-reno demand up.',
  'Trust is broken: CASE 962 reno complaints 2024, ~S$728k losses, ~97% non-accredited → anti-scam content = highest saves.',
  'Winning combo (the gap): budget hook + standout-feature reveal + anti-scam trust + "see YOUR floor plan in 3D free" + always-on paid.',
  'Nestly/astrology: market big + fast-growing; women 18-40 + Gen-Z; "door vs room"; accuracy moat vs ChatGPT-BaZi.',
]

export default function MarketView() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [viral, setViral] = useState<Viral[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: c } = await supabase.from('creator_profiles').select('handle,niche,score,notes').order('score', { ascending: false })
      const { data: v } = await supabase.from('viral_examples').select('hook,format,why_worked,metrics')
      setCreators((c || []) as Creator[]); setViral((v || []) as Viral[]); setLoading(false)
    })()
  }, [])

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 2 }}>Market & competitor intelligence</h2>
      <p style={{ fontSize: 12, color: '#999', marginTop: 0 }}>Fishing intel to use BEFORE making content. Refresh periodically — markets move.</p>
      {loading && <p style={{ color: '#999', fontSize: 13 }}>Loading…</p>}

      <h3 style={{ fontSize: 14 }}>SG renovation — top 5 competitors</h3>
      {RENO_COMPETITORS.map(([name, note]) => (
        <div key={name} style={{ borderBottom: '1px solid #f0f0f0', padding: '6px 0', fontSize: 13 }}>
          <strong>{name}</strong> <span style={{ color: '#666' }}>— {note}</span>
        </div>
      ))}

      <h3 style={{ fontSize: 14, marginTop: 16 }}>Market quick-facts</h3>
      <ul style={{ fontSize: 13, color: '#555' }}>{MARKET_FACTS.map((f, i) => <li key={i} style={{ marginBottom: 4 }}>{f}</li>)}</ul>

      <h3 style={{ fontSize: 14, marginTop: 16 }}>Top creators (scored)</h3>
      {creators.length === 0 && !loading && <p style={{ color: '#999', fontSize: 13 }}>None.</p>}
      {creators.map((c, i) => (
        <div key={i} style={{ borderBottom: '1px solid #f0f0f0', padding: '6px 0', fontSize: 13 }}>
          <strong>{c.handle}</strong> <span style={{ color: '#999' }}>· {c.niche} · score {c.score ?? '—'}</span>
          {c.notes && <div style={{ color: '#666' }}>{c.notes}</div>}
        </div>
      ))}

      <h3 style={{ fontSize: 14, marginTop: 16 }}>Viral mechanics (swipe file)</h3>
      {viral.map((v, i) => (
        <div key={i} style={{ borderBottom: '1px solid #f0f0f0', padding: '6px 0', fontSize: 13 }}>
          <strong>{v.format}</strong> <span style={{ color: '#666' }}>— {v.why_worked}</span>
          {v.metrics?.views && <span style={{ color: '#999' }}> ({v.metrics.views})</span>}
        </div>
      ))}
    </div>
  )
}
