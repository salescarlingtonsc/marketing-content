import { useEffect, useMemo, useState } from 'react'
import {
  type Campaign, type Lead, LEAD_STATUSES, LEAD_FIELDS,
  listCampaigns, createCampaign, listLeads, addLead, importLeads, updateLeadStatus, getScoringConfig,
} from '../lib/leads'
import type { ScoringConfig } from '../lib/leadScore'
import { parseCsv } from '../lib/csv'

const tierColor = (t?: string | null) =>
  t === 'hot' ? '#1a7f37' : t === 'warm' ? '#9a6700' : t === 'nurture' ? '#555' : t === 'giveaway-only' ? '#8250df' : '#b42318'

export default function LeadsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignId, setCampaignId] = useState<string>('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [cfg, setCfg] = useState<ScoringConfig | null>(null)
  const [msg, setMsg] = useState('')

  // manual add
  const [m, setM] = useState({ name: '', phone: '', monthly_savings: '', age: '', occupation: '', prize: '' })
  // csv
  const [csvText, setCsvText] = useState('')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [consent, setConsent] = useState(false)
  const [platform, setPlatform] = useState('TikTok')

  async function refresh() {
    setCampaigns(await listCampaigns())
    setLeads(await listLeads(campaignId ? { campaign_id: campaignId } : undefined))
  }
  useEffect(() => { getScoringConfig().then(setCfg) }, [])
  useEffect(() => { refresh() }, [campaignId])

  async function newCampaign() {
    const name = prompt('New campaign name?')
    if (!name) return
    const prize = prompt('Prize / lead magnet (optional)?') || undefined
    const id = await createCampaign({ name, prize })
    await refresh(); setCampaignId(id)
  }

  async function submitManual() {
    if (!cfg) return
    setMsg('Adding…')
    try {
      await addLead({
        campaign_id: campaignId || null,
        name: m.name || null, phone: m.phone || null,
        monthly_savings: m.monthly_savings ? Number(m.monthly_savings) : null,
        age: m.age ? Number(m.age) : null, occupation: m.occupation || null, prize: m.prize || null,
        platform, source: 'manual', consent: true,
      }, cfg)
      setM({ name: '', phone: '', monthly_savings: '', age: '', occupation: '', prize: '' })
      setMsg('✓ Lead added + scored'); refresh()
    } catch (e: any) { setMsg('Error: ' + (e.message ?? e)) }
  }

  function loadCsv(text: string) {
    setCsvText(text)
    const parsed = parseCsv(text)
    setRows(parsed)
    const hs = parsed.length ? Object.keys(parsed[0]) : []
    setHeaders(hs)
    // auto-map by fuzzy header match
    const auto: Record<string, string> = {}
    for (const field of LEAD_FIELDS) {
      const hit = hs.find((h) => h.toLowerCase().replace(/[^a-z]/g, '').includes(field.replace(/[^a-z]/g, '')))
      if (hit) auto[field] = hit
    }
    setMapping(auto)
  }

  async function runImport() {
    if (!cfg || !rows.length) { setMsg('Paste a CSV first.'); return }
    if (!consent) { setMsg('Tick the consent confirmation before importing leads (PDPA).'); return }
    setMsg('Importing…')
    try {
      const r = await importLeads(rows, mapping, { campaign_id: campaignId || null, platform, consent_source: `${platform.toLowerCase()}_lead_form`, filename: 'pasted.csv' }, cfg)
      setMsg(`✓ Imported + scored ${r.count} leads`); setCsvText(''); setRows([]); setHeaders([]); refresh()
    } catch (e: any) { setMsg('Import error: ' + (e.message ?? e)) }
  }

  async function setStatus(l: Lead, status: string) {
    let extra: any = {}
    if (status === 'Sold') { const amt = prompt('Sale amount / premium (S$)?'); extra.revenue = amt ? Number(amt) : undefined; extra.product = prompt('Product (optional)?') || undefined }
    await updateLeadStatus(l.id, status, extra)
    refresh()
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads) c[l.tier || 'unscored'] = (c[l.tier || 'unscored'] || 0) + 1
    return c
  }, [leads])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={{ padding: 7 }}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name || '(unnamed)'} {c.prize ? `· ${c.prize}` : ''}</option>)}
        </select>
        <button onClick={newCampaign} style={{ padding: '6px 12px', cursor: 'pointer' }}>+ New campaign</button>
        <label style={{ fontSize: 13, color: '#666' }}>
          Platform:{' '}
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ padding: 6 }}>
            <option value="TikTok">TikTok</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="YouTube">YouTube</option>
            <option value="Google">Google</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <span style={{ fontSize: 13, color: '#666' }}>
          {leads.length} leads · {['hot', 'warm', 'nurture', 'giveaway-only', 'trash'].map((t) => `${counts[t] || 0} ${t}`).join(' · ')}
        </span>
      </div>
      {msg && <p style={{ fontSize: 12, color: '#555' }}>{msg}</p>}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Manual add */}
        <section style={{ flex: '1 1 260px', minWidth: 240 }}>
          <h3 style={{ fontSize: 14 }}>Add lead (manual)</h3>
          {([['name', 'Name'], ['phone', 'Phone'], ['monthly_savings', 'Monthly savings (S$)'], ['age', 'Age'], ['occupation', 'Occupation'], ['prize', 'Prize']] as [keyof typeof m, string][]).map(([k, label]) => (
            <input key={k} placeholder={label} value={m[k]} onChange={(e) => setM((p) => ({ ...p, [k]: e.target.value }))} style={{ width: '100%', padding: 6, marginBottom: 6, boxSizing: 'border-box' }} />
          ))}
          <button onClick={submitManual} style={{ padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}>Add + score</button>
        </section>

        {/* CSV import */}
        <section style={{ flex: '2 1 380px', minWidth: 320 }}>
          <h3 style={{ fontSize: 14 }}>Import Meta CSV</h3>
          <textarea value={csvText} onChange={(e) => loadCsv(e.target.value)} placeholder="Paste the Meta leads CSV here (with header row)…" style={{ width: '100%', height: 80, padding: 7, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 12 }} />
          {headers.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: '#666', margin: '8px 0 4px' }}>Map columns ({rows.length} rows detected):</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                {LEAD_FIELDS.map((field) => (
                  <label key={field} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#888' }}>{field === 'ad_set' ? 'ad group' : field}</span>
                    <select value={mapping[field] || ''} onChange={(e) => setMapping((p) => ({ ...p, [field]: e.target.value }))} style={{ padding: 4 }}>
                      <option value="">—</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, margin: '8px 0' }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                These leads consented to be contacted (PDPA).
              </label>
              <button onClick={runImport} style={{ padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}>Import {rows.length} leads</button>
            </>
          )}
        </section>
      </div>

      {/* Leads list */}
      <h3 style={{ fontSize: 14, marginTop: 24 }}>Leads</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead><tr style={{ textAlign: 'left', color: '#888' }}><th>Name</th><th>Savings</th><th>Age</th><th>Prize</th><th>Score</th><th>Tier</th><th>Status (1-tap)</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #eee' }}>
                <td>{l.name || l.phone || '(no name)'}</td>
                <td>{l.savings_band}</td>
                <td>{l.age ?? '—'}</td>
                <td>{l.prize || '—'}</td>
                <td style={{ fontWeight: 700 }}>{l.score ?? '—'}</td>
                <td style={{ color: tierColor(l.tier), fontWeight: 600 }}>{l.tier}</td>
                <td>
                  <select value={l.status || 'new'} onChange={(e) => setStatus(l, e.target.value)} style={{ padding: 4 }}>
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {l.sold ? ` · 💰 S$${l.revenue ?? 0}` : ''}
                </td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={7} style={{ color: '#999', padding: 10 }}>No leads yet — add one or import a CSV.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
