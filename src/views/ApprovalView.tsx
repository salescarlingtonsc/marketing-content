import { useEffect, useState } from 'react'
import { type ReviewPost, approvePost, listReview, logPerformance, markPosted, rejectPost, saveEdits } from '../lib/review'
import { downloadPostPack } from '../lib/contentPack'

const badge = (s?: string | null) =>
  s === 'approved' ? '#1a7f37' : s === 'rejected' ? '#b42318' : s === 'posted' ? '#0969da' : '#9a6700'

export default function ApprovalView() {
  const [posts, setPosts] = useState<ReviewPost[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ hook: string; caption: string; script: string; cta: string }>({ hook: '', caption: '', script: '', cta: '' })

  async function refresh() {
    setLoading(true); setMsg('')
    try { setPosts(await listReview()) }
    catch (e: any) { setMsg(e.message ?? String(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  async function act(label: string, fn: () => Promise<unknown>) {
    setMsg(label + '…')
    try { await fn(); setMsg('✓ ' + label); refresh() }
    catch (e: any) { setMsg('Error: ' + (e.message ?? e)) }
  }

  const pending = posts.filter((p) => p.status === 'pending_approval')
  const decided = posts.filter((p) => p.status !== 'pending_approval')

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 2 }}>Review queue — nothing ships without approval</h2>
      <p style={{ fontSize: 12, color: '#999', marginTop: 0 }}>
        Generate → send to review → approve/edit/reject. Approved posts download as a post pack; after posting, log 48h numbers in 📈 Content — that closes the loop.
      </p>
      {loading && <p style={{ fontSize: 12, color: '#999' }}>Loading…</p>}
      {msg && <p style={{ fontSize: 12, color: msg.startsWith('Error') || msg.includes('missing') ? '#b42318' : '#555' }}>{msg}</p>}

      {pending.length === 0 && !loading && (
        <p style={{ color: '#999', fontSize: 13 }}>Nothing pending. Generate a campaign in ✍️ Generate and hit “Send to review”.</p>
      )}

      {pending.map((p) => (
        <div key={p.id} style={{ border: '1px solid #e3e3e3', borderRadius: 8, padding: 14, marginBottom: 12 }}>
          {editing === p.id ? (
            <>
              {([['hook', 'Hook'], ['caption', 'Caption'], ['cta', 'CTA']] as const).map(([k, label]) => (
                <label key={k} style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#888' }}>{label}</span>
                  <input value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} style={{ width: '100%', padding: 6, marginTop: 2, boxSizing: 'border-box' }} />
                </label>
              ))}
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#888' }}>Script</span>
                <textarea value={draft.script} onChange={(e) => setDraft({ ...draft, script: e.target.value })} rows={4} style={{ width: '100%', padding: 6, marginTop: 2, boxSizing: 'border-box' }} />
              </label>
              <button onClick={() => act('Saved edits', async () => { await saveEdits(p.id, draft); setEditing(null) })} style={{ padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>Save</button>
              <button onClick={() => setEditing(null)} style={{ padding: '7px 14px', cursor: 'pointer', marginLeft: 6 }}>Cancel</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{p.hook}</div>
              <div style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>
                {p.platform ?? 'TikTok'} · scheduled {p.scheduled_at ? new Date(p.scheduled_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' }) + ' SGT' : '—'}
              </div>
              {p.caption && <div style={{ fontSize: 13, color: '#444', whiteSpace: 'pre-wrap', margin: '6px 0' }}>{p.caption}</div>}
              {p.script && (
                <details style={{ fontSize: 12.5, color: '#555', margin: '6px 0' }}>
                  <summary style={{ cursor: 'pointer' }}>Script</summary>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{p.script}</div>
                </details>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={() => act('Approved', () => approvePost(p.id))} style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: 700, background: '#1a7f37', color: '#fff', border: 'none', borderRadius: 5 }}>✓ Approve</button>
                <button onClick={() => { setEditing(p.id); setDraft({ hook: p.hook ?? '', caption: p.caption ?? '', script: p.script ?? '', cta: p.cta ?? '' }) }} style={{ padding: '8px 16px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => { const r = prompt('Reject reason (optional)') ?? ''; act('Rejected', () => rejectPost(p.id, r)) }} style={{ padding: '8px 16px', cursor: 'pointer', color: '#b42318' }}>Reject</button>
              </div>
            </>
          )}
        </div>
      ))}

      {decided.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginTop: 22 }}>Decided</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
            <thead><tr style={{ textAlign: 'left', color: '#888' }}><th>Hook</th><th>Status</th><th>Scheduled (SGT)</th><th></th></tr></thead>
            <tbody>
              {decided.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ maxWidth: 340 }}>{p.hook}</td>
                  <td style={{ color: badge(p.status), fontWeight: 600 }}>{p.status}{p.rejected_reason ? ` — ${p.rejected_reason}` : ''}</td>
                  <td>{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {p.status === 'approved' && (
                      <>
                        <button onClick={() => downloadPostPack(p)} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>⬇ Pack</button>
                        <button onClick={() => { const u = prompt('Posted URL?') ?? ''; act('Marked posted', () => markPosted(p.id, u)) }} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginLeft: 4 }}>Mark posted</button>
                      </>
                    )}
                    {p.status === 'posted' && (
                      <button
                        onClick={() => {
                          const views = Number(prompt('48h views?') ?? '') || null
                          const avg = Number(prompt("Account's average 48h views?") ?? '') || null
                          const saves = Number(prompt('Saves? (optional)') ?? '') || null
                          const shares = Number(prompt('Shares? (optional)') ?? '') || null
                          act('Logged 48h numbers', () => logPerformance(p.id, { views_48h: views, account_avg_48h: avg, saves, shares }))
                        }}
                        style={{ padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                      >Log 48h #s</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
