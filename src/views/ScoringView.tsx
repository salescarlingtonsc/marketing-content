import { useEffect, useState } from 'react'
import { getScoringConfig, updateScoringConfig } from '../lib/leads'
import type { ScoringConfig } from '../lib/leadScore'

const WEIGHTS: [string, string][] = [
  ['monthly_savings', 'Monthly savings'],
  ['age_fit', 'Age fit'],
  ['occupation', 'Occupation / income'],
  ['investing_experience', 'Investing experience'],
  ['response_speed', 'Response speed'],
  ['appt_willingness', 'Appointment willingness'],
  ['giveaway_only_penalty', 'Giveaway-only penalty (−)'],
]

export default function ScoringView() {
  const [cfg, setCfg] = useState<ScoringConfig | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { getScoringConfig().then(setCfg).catch((e) => setMsg('Load error: ' + e.message)) }, [])
  if (!cfg) return <p style={{ color: '#999' }}>Loading…</p>

  const setW = (k: string, v: string) => setCfg({ ...cfg, weights: { ...cfg.weights, [k]: Number(v) || 0 } })
  const setCut = (k: string, v: string) => setCfg({ ...cfg, tier_cutoffs: { ...cfg.tier_cutoffs, [k]: Number(v) || 0 } })
  const setBand = (k: string, v: string) =>
    setCfg({ ...cfg, bands: { ...cfg.bands, savings: { ...(cfg.bands?.savings || {}), [k]: Number(v) || 0 } } })

  async function save() {
    if (!cfg?.id) { setMsg('No editable config (using built-in default).'); return }
    setMsg('Saving…')
    try { await updateScoringConfig(cfg.id, { weights: cfg.weights, bands: cfg.bands, tier_cutoffs: cfg.tier_cutoffs }); setMsg('✓ Saved — new leads will score with these weights') }
    catch (e: any) { setMsg('Error: ' + (e.message ?? e)) }
  }

  const total = Object.entries(cfg.weights).filter(([k]) => k !== 'giveaway_only_penalty').reduce((s, [, v]) => s + (v as number), 0)

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 16, marginBottom: 2 }}>Lead-scoring config — {cfg.name || cfg.vertical}</h2>
      <p style={{ fontSize: 12, color: '#999', marginTop: 0 }}>
        Edit how leads are scored — no developer needed. Other industries differ (e.g. interior design weights renovation budget / BTO timeline, not monthly savings). Positive weights total ≈ {total}.
      </p>

      <h3 style={{ fontSize: 14 }}>Weights</h3>
      {WEIGHTS.map(([k, label]) => (
        <label key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#555' }}>{label}</span>
          <input type="number" value={cfg.weights[k] ?? 0} onChange={(e) => setW(k, e.target.value)} style={{ width: 80, padding: 5 }} />
        </label>
      ))}

      <h3 style={{ fontSize: 14, marginTop: 14 }}>Tier cut-offs (0–100)</h3>
      {(['hot', 'warm', 'nurture'] as const).map((k) => (
        <label key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#555' }}>{k} ≥</span>
          <input type="number" value={cfg.tier_cutoffs[k] ?? 0} onChange={(e) => setCut(k, e.target.value)} style={{ width: 80, padding: 5 }} />
        </label>
      ))}

      <h3 style={{ fontSize: 14, marginTop: 14 }}>Savings bands (S$/month)</h3>
      {(['high', 'mid'] as const).map((k) => (
        <label key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#555' }}>{k === 'high' ? '1k+ threshold' : '500-1k threshold'}</span>
          <input type="number" value={cfg.bands?.savings?.[k] ?? 0} onChange={(e) => setBand(k, e.target.value)} style={{ width: 90, padding: 5 }} />
        </label>
      ))}

      <button onClick={save} style={{ padding: '9px 16px', cursor: 'pointer', fontWeight: 600, marginTop: 12 }}>Save scoring config</button>
      {msg && <p style={{ fontSize: 12, color: '#555', marginTop: 8 }}>{msg}</p>}
    </div>
  )
}
