import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { generateCampaign } from '../lib/generate'
import { scoreHook } from '../lib/score'
import { saveCampaign, loadCampaigns } from '../lib/save'
import type { SavedCampaign } from '../lib/save'
import { FALLBACK_HOOKS } from '../data/hooks'
import type { GenerationResult, HookFormula, Intake, ScoredHook } from '../types'

const DEFAULT_INTAKE: Intake = {
  company: 'Acme Wealth',
  industry: 'financial advisory',
  audience: 'working parents 30-40 in Singapore',
  pain: 'no income protection if something happens',
  desire: 'financial security for their family',
  offer: 'a free 15-minute protection-gap review',
  price: 'S$0',
  platform: 'TikTok / Reels',
  goal: 'appointment',
  regulated: true,
}

const FALLBACK_DISCLAIMERS = [
  'Educational only, not financial advice.',
  'Past performance is not indicative of future results.',
  'Speak to a licensed adviser and complete an FNA before deciding.',
]

export default function GeneratorView() {
  const [intake, setIntake] = useState<Intake>(DEFAULT_INTAKE)
  const [formulas, setFormulas] = useState<HookFormula[]>(FALLBACK_HOOKS)
  const [banned, setBanned] = useState<string[]>([])
  const [disclaimers, setDisclaimers] = useState<string[]>(FALLBACK_DISCLAIMERS)
  const [source, setSource] = useState('loading…')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [aiHooks, setAiHooks] = useState<ScoredHook[]>([])
  const [aiScript, setAiScript] = useState<Record<string, string> | null>(null)
  const [aiExtra, setAiExtra] = useState<any>(null)
  const [aiStatus, setAiStatus] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [saved, setSaved] = useState<SavedCampaign[]>([])

  async function loadSaved() {
    try { setSaved(await loadCampaigns()) } catch { /* ignore */ }
  }
  useEffect(() => { loadSaved() }, [])

  useEffect(() => {
    ;(async () => {
      const { data: f } = await supabase.from('hook_formulas').select('category,formula,why')
      const { data: c } = await supabase.from('compliance_rules').select('industry,banned_phrases,required_disclaimers')
      if (f && f.length) { setFormulas(f as HookFormula[]); setSource(`Supabase (${f.length} hook formulas live)`) }
      else setSource('offline fallback (bundled hooks)')
      if (c && c.length) {
        setBanned(c.flatMap((r: any) => r.banned_phrases ?? []))
        const fin = c.find((r: any) => r.industry === 'finance')
        if (fin?.required_disclaimers?.length) setDisclaimers(fin.required_disclaimers)
      }
    })()
  }, [])

  const set = (k: keyof Intake, v: string | boolean) => setIntake((p) => ({ ...p, [k]: v }))

  function generate() { setResult(generateCampaign(intake, formulas, banned, disclaimers)) }

  async function generateAI() {
    setAiStatus('Generating with Gemini…'); setAiHooks([]); setAiScript(null)
    const { data, error } = await supabase.functions.invoke('generate', { body: { intake } })
    if (error) { setAiStatus(`AI error: ${error.message}`); return }
    const d = data as any
    if (d?.error) { setAiStatus(`AI not ready — ${d.message ?? d.error}`); return }
    const raw = (d?.hooks ?? []) as { category: string; text: string }[]
    const scored = raw.map((h) => { const s = scoreHook(h.text, intake, banned); s.category = h.category; return s })
    scored.sort((a, b) => b.score - a.score)
    setAiHooks(scored)
    setAiScript(d?.script ?? null)
    setAiExtra({ adCopy: d?.adCopy, leadMagnet: d?.leadMagnet, followUp: d?.followUp ?? [], objections: d?.objections ?? [] })
    setAiStatus(`Gemini returned a full campaign (${scored.length} hooks)`)
  }

  async function save() {
    const hooks = aiHooks.length ? aiHooks : result?.hooks ?? []
    if (!hooks.length) { setSaveMsg('Generate a campaign first.'); return }
    setSaveMsg('Saving…')
    try { const r = await saveCampaign(intake, hooks); setSaveMsg(`✓ Saved "${intake.company}" + ${r.count} ideas`); loadSaved() }
    catch (e: any) { setSaveMsg(`Save failed: ${e.message ?? e}`) }
  }

  return (
    <>
      <p style={{ color: '#777', marginTop: 0, fontSize: 14 }}>
        Intake → campaign. Same logic, different ingredients. Reference data: <strong>{source}</strong>.
      </p>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <section style={{ flex: '1 1 320px', minWidth: 300 }}>
          <h2 style={{ fontSize: 16 }}>1. Ingredients (intake)</h2>
          {([
            ['company', 'Company'], ['industry', 'Industry'], ['audience', 'Best-customer audience'],
            ['pain', 'Top pain'], ['desire', 'Top desire'], ['offer', 'Offer / dream outcome'],
            ['price', 'Price'], ['platform', 'Platform'],
          ] as [keyof Intake, string][]).map(([k, label]) => (
            <label key={k} style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#888' }}>{label}</span>
              <input value={String(intake[k])} onChange={(e) => set(k, e.target.value)} style={{ width: '100%', padding: 7, marginTop: 2, boxSizing: 'border-box' }} />
            </label>
          ))}
          <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#888' }}>Goal</span>
            <select value={intake.goal} onChange={(e) => set('goal', e.target.value)} style={{ width: '100%', padding: 7, marginTop: 2 }}>
              <option value="lead">Lead</option><option value="appointment">Appointment</option><option value="sale">Sale</option><option value="followers">Followers</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12 }}>
            <input type="checkbox" checked={intake.regulated} onChange={(e) => set('regulated', e.target.checked)} />
            Regulated (finance / insurance — apply compliance gate)
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={generate} style={{ padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>Generate (rules)</button>
            <button onClick={generateAI} style={{ padding: '10px 18px', cursor: 'pointer' }}>✨ AI mode (Gemini)</button>
            <button onClick={save} style={{ padding: '10px 18px', cursor: 'pointer' }}>💾 Save campaign</button>
          </div>
          {aiStatus && <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{aiStatus}</p>}
          {saveMsg && <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{saveMsg}</p>}
        </section>

        <section style={{ flex: '2 1 440px', minWidth: 320 }}>
          {!result && aiHooks.length === 0 && <p style={{ color: '#999' }}>Fill the ingredients and hit Generate.</p>}
          {aiHooks.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 16 }}>✨ AI hooks (Gemini, scored)</h2>
              {aiHooks.slice(0, 8).map((h, i) => (
                <div key={i} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontWeight: 600 }}>{h.text}</span>
                    <span style={{ whiteSpace: 'nowrap', fontWeight: 700, color: h.score >= 80 ? '#1a7f37' : h.score >= 60 ? '#9a6700' : '#b42318' }}>{h.score}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>{h.category} · {h.band}{h.flags.length ? ` · ⚠️ ${h.flags.length}` : ''}</div>
                </div>
              ))}
              {aiScript && <div style={{ marginTop: 10, fontSize: 13, background: '#f7f7f8', padding: 10, borderRadius: 6 }}><strong>Script:</strong> {aiScript.hook} → {aiScript.context} → {aiScript.rehook} → {aiScript.payoff} → <em>{aiScript.cta}</em></div>}
              {aiExtra?.adCopy && <div style={{ marginTop: 12, fontSize: 13 }}><strong>Meta ad copy</strong><div style={{ color: '#444', marginTop: 4 }}>{aiExtra.adCopy.primaryText}</div><div style={{ color: '#888' }}><em>{aiExtra.adCopy.headline}</em> — {aiExtra.adCopy.description}</div></div>}
              {aiExtra?.leadMagnet && <div style={{ marginTop: 12, fontSize: 13 }}><strong>Lead magnet:</strong> {aiExtra.leadMagnet.title}<div style={{ color: '#666' }}>{aiExtra.leadMagnet.description}</div><div style={{ color: '#999', fontSize: 12 }}>Screens out: {aiExtra.leadMagnet.filters}</div></div>}
              {aiExtra?.followUp?.length > 0 && <div style={{ marginTop: 12, fontSize: 13 }}><strong>Follow-up sequence</strong><ol style={{ paddingLeft: 18, marginTop: 4 }}>{aiExtra.followUp.map((s: any, i: number) => <li key={i} style={{ marginBottom: 4 }}><span style={{ color: '#888' }}>[{s.channel} · {s.timing}]</span> {s.message}</li>)}</ol></div>}
              {aiExtra?.objections?.length > 0 && <div style={{ marginTop: 12, fontSize: 13 }}><strong>Objection handling</strong>{aiExtra.objections.map((o: any, i: number) => <div key={i} style={{ marginTop: 4 }}><span style={{ color: '#b42318' }}>“{o.objection}”</span> → {o.response}</div>)}</div>}
            </div>
          )}
          {result && (
            <>
              {result.complianceFlags.length > 0 && <div style={{ background: '#fff3f0', border: '1px solid #f1b7a8', padding: 10, borderRadius: 6, marginBottom: 14, fontSize: 13 }}><strong>⚠️ Compliance flags</strong><ul style={{ margin: '6px 0 0' }}>{result.complianceFlags.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
              <h2 style={{ fontSize: 16 }}>2. Hooks (scored, ranked)</h2>
              {result.hooks.slice(0, 8).map((h, i) => (
                <div key={i} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontWeight: 600 }}>{h.text}</span>
                    <span title={h.band} style={{ whiteSpace: 'nowrap', fontWeight: 700, color: h.score >= 80 ? '#1a7f37' : h.score >= 60 ? '#9a6700' : '#b42318' }}>{h.score}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>{h.category} · {h.band} · {h.why}{h.flags.length ? ` · ⚠️ ${h.flags.length}` : ''}</div>
                </div>
              ))}
              <h2 style={{ fontSize: 16, marginTop: 20 }}>3. 7-day calendar</h2>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                <thead><tr style={{ textAlign: 'left', color: '#888' }}><th>Day</th><th>Pillar</th><th>Format</th><th>Hook</th></tr></thead>
                <tbody>{result.calendar.map((c) => <tr key={c.day} style={{ borderTop: '1px solid #eee' }}><td>{c.day}</td><td>{c.pillar}</td><td>{c.format}</td><td>{c.hook}</td></tr>)}</tbody>
              </table>
              <h2 style={{ fontSize: 16, marginTop: 20 }}>4. Lead-form questions</h2>
              <ol style={{ fontSize: 13, paddingLeft: 18 }}>{result.leadFormQuestions.map((q, i) => <li key={i}>{q}</li>)}</ol>
              {result.disclaimers.length > 0 && <><h2 style={{ fontSize: 16, marginTop: 20 }}>5. Required disclaimers</h2><ul style={{ fontSize: 13, color: '#555' }}>{result.disclaimers.map((d, i) => <li key={i}>{d}</li>)}</ul></>}
            </>
          )}
        </section>
      </div>

      <section style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: 16 }}>Saved campaigns ({saved.length})</h2>
          <button onClick={loadSaved} style={{ fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}>Refresh</button>
        </div>
        {saved.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>None yet — generate a campaign and hit Save.</p>}
        {saved.map((c) => (
          <details key={c.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '6px 0', fontSize: 13 }}>
            <summary style={{ cursor: 'pointer' }}><strong>{c.name}</strong> <span style={{ color: '#999' }}>· {c.industry} · {c.content_ideas.length} ideas · {new Date(c.created_at).toLocaleDateString()}</span></summary>
            <ul style={{ marginTop: 6 }}>{c.content_ideas.slice(0, 10).map((idea, i) => <li key={i}><span style={{ color: '#999' }}>[{idea.angle} · {idea.viral_score}]</span> {idea.hook}</li>)}</ul>
          </details>
        ))}
      </section>
    </>
  )
}
