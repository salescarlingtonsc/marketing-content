import { useEffect, useMemo, useState } from 'react'
import { type Campaign, type Lead, listCampaigns, listLeads, setCampaignSpend } from '../lib/leads'
import { aggregateBy, ageBand, type GroupMetrics, type SpendByCampaign } from '../lib/insights'

type Dim = 'campaign' | 'prize' | 'ad_name' | 'ad_set_name' | 'gender' | 'age' | 'savings' | 'platform' | 'creative_angle'

const DIMS: [Dim, string][] = [
  ['campaign', 'Campaign'], ['prize', 'Prize'], ['ad_name', 'Ad'], ['ad_set_name', 'Ad group'],
  ['gender', 'Gender'], ['age', 'Age band'], ['savings', 'Savings band'], ['platform', 'Platform'], ['creative_angle', 'Hook / angle'],
]

const money = (x: number | null) => (x == null ? '—' : 'S$' + Math.round(x))
const pct = (x: number) => Math.round(x * 100) + '%'

export default function DashboardView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [dim, setDim] = useState<Dim>('campaign')

  async function refresh() {
    setCampaigns(await listCampaigns())
    setLeads(await listLeads())
  }
  useEffect(() => { refresh() }, [])

  const campName = useMemo(() => Object.fromEntries(campaigns.map((c) => [c.id, c.name || '(unnamed)'])), [campaigns])
  const spendByCampaign = useMemo<SpendByCampaign>(() => Object.fromEntries(campaigns.map((c) => [c.id, c.spent ?? 0])), [campaigns])

  const keyFn = useMemo<(l: Lead) => string>(() => {
    switch (dim) {
      case 'campaign': return (l) => l.campaign_id || 'unattributed'
      case 'prize': return (l) => l.prize || 'none'
      case 'ad_name': return (l) => l.ad_name || 'unknown'
      case 'ad_set_name': return (l) => l.ad_set_name || 'unknown'
      case 'gender': return (l) => l.gender || 'unknown'
      case 'age': return (l) => ageBand(l.age)
      case 'savings': return (l) => l.savings_band || 'unknown'
      case 'platform': return (l) => l.platform || 'unknown'
      case 'creative_angle': return (l) => l.creative_angle || 'unknown'
    }
  }, [dim])

  const rows: GroupMetrics[] = useMemo(
    () => aggregateBy(leads, keyFn, spendByCampaign, dim === 'campaign'),
    [leads, keyFn, spendByCampaign, dim],
  )

  const label = (k: string) => (dim === 'campaign' ? (campName[k] || k) : k)

  async function editSpend(c: Campaign) {
    const v = prompt(`Ad spend for "${c.name || c.id}" (S$)?`, String(c.spent ?? 0))
    if (v == null) return
    await setCampaignSpend(c.id, Number(v) || 0)
    refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <strong style={{ fontSize: 14 }}>Compare by:</strong>
        <select value={dim} onChange={(e) => setDim(e.target.value as Dim)} style={{ padding: 6 }}>
          {DIMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#999' }}>Judged by CPQL + sales, not vanity CPL.</span>
      </div>

      {/* spend editor (manual until Meta API) */}
      <details style={{ marginBottom: 10, fontSize: 13 }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>Set ad spend per campaign (manual)</summary>
        <div style={{ marginTop: 6 }}>
          {campaigns.map((c) => (
            <span key={c.id} style={{ display: 'inline-block', marginRight: 12, marginBottom: 6 }}>
              {c.name || '(unnamed)'}: <button onClick={() => editSpend(c)} style={{ cursor: 'pointer' }}>S${c.spent ?? 0}</button>
            </span>
          ))}
          {campaigns.length === 0 && <span style={{ color: '#999' }}>No campaigns yet.</span>}
        </div>
      </details>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#888' }}>
              <th>{DIMS.find((d) => d[0] === dim)?.[1]}</th>
              <th>Leads</th><th>Quality</th><th>Spend</th><th>CPL</th>
              <th style={{ color: '#111' }}>CPQL</th><th>$1k+ %</th><th>Appt %</th><th>Show %</th><th>Close %</th><th>Revenue</th><th>Cost/sale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} style={{ borderTop: '1px solid #eee' }}>
                <td>{label(r.key)}</td>
                <td>{r.leads}</td>
                <td>{r.qualityLeads}</td>
                <td>{money(r.spend)}</td>
                <td>{money(r.cpl)}</td>
                <td style={{ fontWeight: 700, color: r.cpql == null ? '#999' : '#111' }}>{money(r.cpql)}</td>
                <td>{pct(r.savings1kRatio)}</td>
                <td>{pct(r.apptRate)}</td>
                <td>{pct(r.showupRate)}</td>
                <td>{pct(r.closeRate)}</td>
                <td style={{ fontWeight: 600, color: r.revenue > 0 ? '#1a7f37' : '#999' }}>{money(r.revenue)}</td>
                <td>{money(r.costPerSale)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={12} style={{ color: '#999', padding: 10 }}>No leads yet — import some, then set campaign spend.</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#bbb', marginTop: 10 }}>
        Quality lead = score ≥ 60. CPQL = spend ÷ quality leads. A cheap-CPL campaign with no revenue is NOT a winner.
      </p>
    </div>
  )
}
