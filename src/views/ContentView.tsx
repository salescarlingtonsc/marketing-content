import { useEffect, useMemo, useState } from 'react'
import { type Post, addPost, listPosts, outlierScore, verdictFor } from '../lib/posts'
import { type Campaign, type Lead, listCampaigns, listLeads } from '../lib/leads'

const verdictColor = (v?: string | null) =>
  v === 'full campaign' ? '#1a7f37' : v === 'boost' ? '#1a7f37' : v === 'clone angle' ? '#0969da'
    : v === 'keep testing' ? '#9a6700' : v === 'kill' ? '#b42318' : '#999'

const norm = (s?: string | null) => (s || '').trim().toLowerCase()

export default function ContentView() {
  const [posts, setPosts] = useState<Post[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [msg, setMsg] = useState('')
  const [f, setF] = useState({ campaign_id: '', hook: '', platform: 'TikTok', url: '', views_48h: '', account_avg_48h: '', saves: '', shares: '', comments: '' })

  async function refresh() {
    setPosts(await listPosts()); setLeads(await listLeads()); setCampaigns(await listCampaigns())
  }
  useEffect(() => { refresh() }, [])

  const livePreview = outlierScore(Number(f.views_48h) || null, Number(f.account_avg_48h) || null)

  async function submit() {
    if (!f.hook.trim()) { setMsg('Add the hook/angle this post used.'); return }
    setMsg('Saving…')
    try {
      await addPost({
        campaign_id: f.campaign_id || null, hook: f.hook, platform: f.platform, url: f.url || null,
        views_48h: Number(f.views_48h) || null, account_avg_48h: Number(f.account_avg_48h) || null,
        saves: Number(f.saves) || null, shares: Number(f.shares) || null, comments: Number(f.comments) || null,
      })
      setF({ ...f, hook: '', url: '', views_48h: '', saves: '', shares: '', comments: '' })
      setMsg('✓ Post logged + scored'); refresh()
    } catch (e: any) { setMsg('Error: ' + (e.message ?? e)) }
  }

  // Attribute leads to a post by matching campaign + hook/creative-angle (v1 link).
  const attributed = useMemo(() => {
    const map: Record<string, { leads: number; quality: number; sales: number; revenue: number }> = {}
    for (const p of posts) {
      const ls = leads.filter((l) => norm(l.creative_angle) === norm(p.hook) && (!p.campaign_id || l.campaign_id === p.campaign_id))
      map[p.id] = {
        leads: ls.length,
        quality: ls.filter((l) => (l.score ?? 0) >= 60).length,
        sales: ls.filter((l) => l.sold).length,
        revenue: ls.reduce((s, l) => s + (l.revenue ?? 0), 0),
      }
    }
    return map
  }, [posts, leads])

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 2 }}>Content performance — which hook/video actually worked</h2>
      <p style={{ fontSize: 12, color: '#999', marginTop: 0 }}>
        Log a posted video with its 48h views; the Outlier Score = (48h views ÷ your account's avg 48h views) × 100. Leads are tied back by hook/angle.
      </p>

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8, fontSize: 13 }}>
        <select value={f.campaign_id} onChange={(e) => setF({ ...f, campaign_id: e.target.value })} style={{ padding: 6 }}>
          <option value="">(no campaign)</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name || '(unnamed)'}</option>)}
        </select>
        <input placeholder="hook / angle used" value={f.hook} onChange={(e) => setF({ ...f, hook: e.target.value })} style={{ padding: 6, minWidth: 220 }} />
        <input placeholder="post URL" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} style={{ padding: 6, width: 130 }} />
        <input placeholder="48h views" value={f.views_48h} onChange={(e) => setF({ ...f, views_48h: e.target.value })} style={{ padding: 6, width: 90 }} />
        <input placeholder="acct avg 48h" value={f.account_avg_48h} onChange={(e) => setF({ ...f, account_avg_48h: e.target.value })} style={{ padding: 6, width: 100 }} />
        <input placeholder="saves" value={f.saves} onChange={(e) => setF({ ...f, saves: e.target.value })} style={{ padding: 6, width: 70 }} />
        <input placeholder="shares" value={f.shares} onChange={(e) => setF({ ...f, shares: e.target.value })} style={{ padding: 6, width: 70 }} />
        <button onClick={submit} style={{ padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}>Log post</button>
        {livePreview != null && <span style={{ color: verdictColor(verdictFor(livePreview)), fontWeight: 600 }}>→ Outlier {livePreview} · {verdictFor(livePreview)}</span>}
      </section>
      {msg && <p style={{ fontSize: 12, color: '#555' }}>{msg}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead><tr style={{ textAlign: 'left', color: '#888' }}>
            <th>Hook / angle</th><th>Platform</th><th>48h views</th><th>Outlier</th><th>Verdict</th><th>Leads</th><th>Quality</th><th>Sales</th><th>Revenue</th>
          </tr></thead>
          <tbody>
            {posts.map((p) => {
              const a = attributed[p.id] || { leads: 0, quality: 0, sales: 0, revenue: 0 }
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ maxWidth: 280 }}>{p.hook}</td>
                  <td>{p.platform}</td>
                  <td>{p.views_48h?.toLocaleString() ?? '—'}</td>
                  <td style={{ fontWeight: 700 }}>{p.outlier_score ?? '—'}</td>
                  <td style={{ color: verdictColor(p.verdict), fontWeight: 600 }}>{p.verdict}</td>
                  <td>{a.leads}</td>
                  <td>{a.quality}</td>
                  <td style={{ fontWeight: 600, color: a.sales ? '#1a7f37' : '#999' }}>{a.sales}</td>
                  <td style={{ color: a.revenue ? '#1a7f37' : '#999' }}>{a.revenue ? 'S$' + a.revenue : '—'}</td>
                </tr>
              )
            })}
            {posts.length === 0 && <tr><td colSpan={9} style={{ color: '#999', padding: 10 }}>No posts logged yet. Log one above to start tracking which content produces leads + sales.</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: '#bbb', marginTop: 10 }}>
        Leads tie to a post when their "creative angle" matches the hook (tag your ad/post with the same hook label on import). This is the content→sales loop.
      </p>
    </div>
  )
}
