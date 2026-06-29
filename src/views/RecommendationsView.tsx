import { useEffect, useMemo, useState } from 'react'
import { type Campaign, type Lead, listCampaigns, listLeads } from '../lib/leads'
import { aggregateBy, ageBand, recommendations, type Rec, type SpendByCampaign } from '../lib/insights'

const typeColor: Record<string, string> = {
  scale: '#1a7f37', kill: '#b42318', clone: '#0969da', retarget: '#8250df',
  'improve form': '#9a6700', 'improve follow-up': '#9a6700', 'improve pitch': '#9a6700',
  'flag trash': '#b42318', 'keep testing': '#999',
}

export default function RecommendationsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => { (async () => { setCampaigns(await listCampaigns()); setLeads(await listLeads()) })() }, [])

  const campName = useMemo(() => Object.fromEntries(campaigns.map((c) => [c.id, c.name || '(unnamed)'])), [campaigns])
  const spend = useMemo<SpendByCampaign>(() => Object.fromEntries(campaigns.map((c) => [c.id, c.spent ?? 0])), [campaigns])

  const recs: Rec[] = useMemo(() => {
    const byCampaign = aggregateBy(leads, (l) => l.campaign_id || 'unattributed', spend, true)
    const byPrize = aggregateBy(leads, (l) => l.prize || 'none', spend)
    const byAge = aggregateBy(leads, (l) => ageBand(l.age), spend)
    return recommendations(byCampaign, byPrize, byAge)
  }, [leads, spend])

  const prettyTarget = (t: string) => {
    if (t.startsWith('campaign:')) return 'Campaign: ' + (campName[t.slice(9)] || t.slice(9))
    return t.replace(':', ': ')
  }

  const actionable = recs.filter((r) => r.type !== 'keep testing')
  const testing = recs.filter((r) => r.type === 'keep testing')

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>This Week</h2>
      <p style={{ fontSize: 13, color: '#777', marginTop: 0 }}>
        Simple rules over your real data, with minimum-sample gates (needs ≥20 leads before a confident call).
      </p>

      {actionable.length === 0 && (
        <p style={{ color: '#999', fontSize: 14 }}>
          No confident recommendations yet — log more leads + outcomes (need ≥20 leads per campaign). Check back after this week's data.
        </p>
      )}

      {actionable.map((r, i) => (
        <div key={i} style={{ borderLeft: `3px solid ${typeColor[r.type] || '#888'}`, padding: '8px 12px', marginBottom: 8, background: '#fafafa', borderRadius: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong style={{ textTransform: 'uppercase', fontSize: 12, color: typeColor[r.type] || '#333' }}>{r.type}</strong>
            <span style={{ fontSize: 11, color: '#999' }}>{r.confidence} confidence · n={r.sample}</span>
          </div>
          <div style={{ fontSize: 13, marginTop: 2 }}>{r.text}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{prettyTarget(r.target)}</div>
        </div>
      ))}

      {testing.length > 0 && (
        <details style={{ marginTop: 14, fontSize: 13 }}>
          <summary style={{ cursor: 'pointer', color: '#999' }}>Not enough data yet ({testing.length})</summary>
          <ul style={{ marginTop: 6 }}>{testing.map((r, i) => <li key={i} style={{ color: '#888' }}>{prettyTarget(r.target)} — {r.text}</li>)}</ul>
        </details>
      )}
    </div>
  )
}
