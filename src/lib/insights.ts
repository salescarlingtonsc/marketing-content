import type { Lead } from './leads'

export type SpendByCampaign = Record<string, number>

export interface GroupMetrics {
  key: string
  leads: number
  qualityLeads: number
  spend: number
  cpl: number | null
  cpql: number | null
  savings1kRatio: number
  apptRate: number
  showupRate: number
  closeRate: number
  revenue: number
  costPerAppt: number | null
  costPerSale: number | null
}

export const QUALITY_CUT = 60

export function ageBand(age?: number | null): string {
  if (age == null) return 'unknown'
  if (age <= 24) return '18-24'
  if (age <= 34) return '25-34'
  if (age <= 44) return '35-44'
  if (age <= 54) return '45-54'
  return '55+'
}

export function aggregateBy(
  leads: Lead[],
  keyFn: (l: Lead) => string,
  spendByCampaign: SpendByCampaign,
  isCampaignDim = false,
): GroupMetrics[] {
  const groups = new Map<string, Lead[]>()
  for (const l of leads) {
    const key = keyFn(l) || 'unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(l)
  }
  const out: GroupMetrics[] = []
  for (const [key, ls] of groups) {
    const n = ls.length
    const quality = ls.filter((l) => (l.score ?? 0) >= QUALITY_CUT).length
    let spend = 0
    if (isCampaignDim) spend = spendByCampaign[key] ?? 0
    else { const camps = new Set(ls.map((l) => l.campaign_id).filter(Boolean) as string[]); camps.forEach((c) => { spend += spendByCampaign[c] ?? 0 }) }
    const booked = ls.filter((l) => l.appt_booked).length
    const attended = ls.filter((l) => l.appt_attended).length
    const sold = ls.filter((l) => l.sold).length
    const revenue = ls.reduce((s, l) => s + (l.revenue ?? 0), 0)
    const savings1k = ls.filter((l) => l.savings_band === '1k+').length
    out.push({
      key, leads: n, qualityLeads: quality, spend,
      cpl: n ? spend / n : null,
      cpql: quality ? spend / quality : null,
      savings1kRatio: n ? savings1k / n : 0,
      apptRate: n ? booked / n : 0,
      showupRate: booked ? attended / booked : 0,
      closeRate: booked ? sold / booked : (n ? sold / n : 0),
      revenue,
      costPerAppt: booked ? spend / booked : null,
      costPerSale: sold ? spend / sold : null,
    })
  }
  return out.sort((a, b) => b.revenue - a.revenue || (a.cpql ?? 1e12) - (b.cpql ?? 1e12))
}

export interface Rec { type: string; target: string; text: string; confidence: 'high' | 'low'; sample: number }

const MIN_LEADS = 20

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const money = (x: number) => 'S$' + Math.round(x)
const pct = (x: number) => Math.round(x * 100) + '%'

export function recommendations(byCampaign: GroupMetrics[], byPrize: GroupMetrics[], byAge: GroupMetrics[]): Rec[] {
  const recs: Rec[] = []
  const medCpql = median(byCampaign.map((g) => g.cpql).filter((x): x is number => x != null))

  for (const c of byCampaign) {
    if (c.leads < MIN_LEADS) {
      recs.push({ type: 'keep testing', target: `campaign:${c.key}`, text: `Only ${c.leads} leads — keep testing (need ≥${MIN_LEADS} before judging).`, confidence: 'low', sample: c.leads })
      continue
    }
    if (c.revenue === 0 && c.spend > 0) recs.push({ type: 'kill', target: `campaign:${c.key}`, text: `Spent ${money(c.spend)}, ${c.leads} leads, zero revenue — kill or rework.`, confidence: 'high', sample: c.leads })
    if (c.cpql != null && medCpql != null && c.cpql <= medCpql && c.revenue > 0) recs.push({ type: 'scale', target: `campaign:${c.key}`, text: `CPQL ${money(c.cpql)} ≤ median ${money(medCpql)} and producing revenue — scale.`, confidence: 'high', sample: c.leads })
    if (c.qualityLeads / Math.max(1, c.leads) < 0.2) recs.push({ type: 'improve form', target: `campaign:${c.key}`, text: `Cheap leads but poor quality (${pct(c.qualityLeads / c.leads)} are quality) — tighten lead-form/filtering.`, confidence: 'high', sample: c.leads })
    if (c.apptRate < 0.15 && c.qualityLeads >= 5) recs.push({ type: 'improve follow-up', target: `campaign:${c.key}`, text: `Quality leads but low booking (${pct(c.apptRate)}) — improve follow-up speed/sequence.`, confidence: 'high', sample: c.leads })
    if (c.showupRate > 0 && c.closeRate < 0.1) recs.push({ type: 'improve pitch', target: `campaign:${c.key}`, text: `Show-ups but weak close (${pct(c.closeRate)}) — improve pitch/offer.`, confidence: 'high', sample: c.leads })
  }

  const bestPrize = [...byPrize].filter((p) => p.leads >= MIN_LEADS && p.cpql != null).sort((a, b) => a.cpql! - b.cpql!)[0]
  if (bestPrize) recs.push({ type: 'clone', target: `prize:${bestPrize.key}`, text: `Best prize by CPQL: "${bestPrize.key}" at ${money(bestPrize.cpql!)} — clone its angle.`, confidence: 'high', sample: bestPrize.leads })
  for (const p of byPrize) if (p.leads >= MIN_LEADS && p.savings1kRatio < 0.15) recs.push({ type: 'flag trash', target: `prize:${p.key}`, text: `Prize "${p.key}" mostly <$500 savers (only ${pct(p.savings1kRatio)} are $1k+) — trash-prone.`, confidence: 'high', sample: p.leads })

  const bestAge = [...byAge].filter((a) => a.leads >= MIN_LEADS).sort((x, y) => y.savings1kRatio - x.savings1kRatio)[0]
  if (bestAge) recs.push({ type: 'retarget', target: `age:${bestAge.key}`, text: `Best age for $1k+ savers: ${bestAge.key} (${pct(bestAge.savings1kRatio)}) — weight budget here.`, confidence: 'high', sample: bestAge.leads })

  return recs
}
