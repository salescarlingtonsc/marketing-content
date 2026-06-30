import { supabase } from './supabase'
import { computeLeadScore, DEFAULT_INVESTMENT_CONFIG, type ScoringConfig } from './leadScore'
import { parseSavings, bandFromSavings } from './csv'

export interface Lead {
  id: string
  company_id?: string | null
  campaign_id?: string | null
  name?: string | null
  phone?: string | null
  email?: string | null
  age?: number | null
  gender?: string | null
  monthly_savings?: number | null
  savings_band?: string | null
  occupation?: string | null
  investing_experience?: string | null
  risk_appetite?: string | null
  platform?: string | null
  prize?: string | null
  ad_name?: string | null
  ad_set_name?: string | null
  creative_angle?: string | null
  form_name?: string | null
  source?: string | null
  status?: string | null
  score?: number | null
  tier?: string | null
  appt_booked?: boolean | null
  appt_attended?: boolean | null
  sold?: boolean | null
  revenue?: number | null
  remarks?: string | null
  consent?: boolean | null
  created_at?: string
}

export interface Campaign {
  id: string
  name?: string | null
  prize?: string | null
  platform?: string | null
  spent?: number | null
  company_id?: string | null
  started_at?: string | null
}

export const LEAD_STATUSES = [
  'new', 'Contacted', 'No response', 'Replied', 'Qualified', 'Not qualified',
  'Appointment booked', 'Appointment attended', 'No show', 'Sold', 'Lost', 'Nurture', 'Trash',
]

export async function getScoringConfig(companyId?: string | null): Promise<ScoringConfig> {
  const { data } = await supabase.from('scoring_configs').select('*')
  const rows = (data || []) as any[]
  const pick = (companyId && rows.find((r) => r.company_id === companyId)) || rows.find((r) => r.is_default) || rows[0]
  return pick
    ? { id: pick.id, vertical: pick.vertical, name: pick.name, weights: pick.weights, bands: pick.bands, tier_cutoffs: pick.tier_cutoffs }
    : DEFAULT_INVESTMENT_CONFIG
}

export async function updateScoringConfig(id: string, patch: { weights?: any; bands?: any; tier_cutoffs?: any; name?: string }) {
  const { error } = await supabase.from('scoring_configs').update(patch).eq('id', id)
  if (error) throw error
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('ad_campaigns')
    .select('id,name,prize,platform,spent,company_id,started_at')
    .order('started_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data || []) as Campaign[]
}

export async function createCampaign(c: { name: string; prize?: string; platform?: string; spent?: number; company_id?: string | null }) {
  const { data, error } = await supabase
    .from('ad_campaigns')
    .insert({ name: c.name, prize: c.prize || null, platform: c.platform || null, spent: c.spent ?? 0, company_id: c.company_id ?? null, started_at: new Date().toISOString().slice(0, 10) })
    .select('id').single()
  if (error) throw error
  return data!.id as string
}

export async function setCampaignSpend(id: string, spent: number) {
  const { error } = await supabase.from('ad_campaigns').update({ spent }).eq('id', id)
  if (error) throw error
}

export async function listLeads(filter?: { campaign_id?: string }): Promise<Lead[]> {
  let q = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(2000)
  if (filter?.campaign_id) q = q.eq('campaign_id', filter.campaign_id)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as Lead[]
}

export async function addLead(input: Partial<Lead>, cfg: ScoringConfig) {
  const savings_band = input.savings_band || bandFromSavings(input.monthly_savings ?? null)
  const scored = computeLeadScore({ ...input, savings_band } as any, cfg)
  const row: any = { ...input, savings_band, score: scored.score, tier: scored.tier, status: input.status || 'new' }
  const { data, error } = await supabase.from('leads').insert(row).select('id').single()
  if (error) throw error
  await supabase.from('lead_scores').insert({ lead_id: data!.id, config_id: cfg.id ?? null, score: scored.score, tier: scored.tier, breakdown: scored.breakdown })
  return data!.id as string
}

// Field keys we can map CSV columns to.
export const LEAD_FIELDS = ['name', 'phone', 'email', 'age', 'birth_year', 'gender', 'monthly_savings', 'occupation', 'investing_experience', 'risk_appetite', 'ad', 'ad_set', 'creative_angle', 'form', 'prize', 'platform', 'remarks']

export async function importLeads(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  ctx: { company_id?: string | null; campaign_id?: string | null; prize?: string; platform?: string; consent_source?: string; filename?: string },
  cfg: ScoringConfig,
) {
  const get = (r: Record<string, string>, field: string) => { const h = mapping[field]; return h ? (r[h] ?? '').trim() : '' }
  const imp = await supabase.from('lead_imports')
    .insert({ company_id: ctx.company_id ?? null, campaign_id: ctx.campaign_id ?? null, filename: ctx.filename || null, source: 'csv_meta', row_count: rows.length, mapping })
    .select('id').single()
  const importId = imp.data?.id ?? null

  const built = rows.map((r) => {
    const { value: msv, band } = parseSavings(get(r, 'monthly_savings'))
    const ageRaw = get(r, 'age'); const byRaw = get(r, 'birth_year')
    const age = ageRaw ? parseInt(ageRaw, 10) : (byRaw ? new Date().getFullYear() - parseInt(byRaw, 10) : null)
    const base: any = {
      company_id: ctx.company_id ?? null,
      campaign_id: ctx.campaign_id ?? null,
      import_id: importId,
      name: get(r, 'name') || null, phone: get(r, 'phone') || null, email: get(r, 'email') || null,
      age: Number.isFinite(age as number) ? age : null, gender: get(r, 'gender') || null,
      monthly_savings: msv, savings_band: band,
      occupation: get(r, 'occupation') || null, investing_experience: get(r, 'investing_experience') || null, risk_appetite: get(r, 'risk_appetite') || null,
      platform: get(r, 'platform') || ctx.platform || null, prize: get(r, 'prize') || ctx.prize || null,
      ad_name: get(r, 'ad') || null, ad_set_name: get(r, 'ad_set') || null, creative_angle: get(r, 'creative_angle') || null,
      form_name: get(r, 'form') || null, remarks: get(r, 'remarks') || null,
      source: 'csv_meta', consent: true, consent_source: ctx.consent_source || 'lead_form', status: 'new',
    }
    const scored = computeLeadScore(base, cfg)
    return { row: { ...base, score: scored.score, tier: scored.tier }, breakdown: scored.breakdown, score: scored.score, tier: scored.tier }
  })

  const { data: inserted, error } = await supabase.from('leads').insert(built.map((b) => b.row)).select('id')
  if (error) throw error
  if (inserted?.length) {
    await supabase.from('lead_scores').insert(inserted.map((row, i) => ({
      lead_id: row.id, config_id: cfg.id ?? null, score: built[i].score, tier: built[i].tier, breakdown: built[i].breakdown,
    })))
  }
  return { count: inserted?.length ?? 0 }
}

export async function updateLeadStatus(
  leadId: string,
  status: string,
  extra?: { revenue?: number; product?: string; reason?: string; appt_date?: string; notes?: string },
) {
  const patch: any = { status }
  if (status === 'Contacted' || status === 'Replied') patch.first_response_at = new Date().toISOString()
  if (status === 'Appointment booked') patch.appt_booked = true
  if (status === 'Appointment attended') { patch.appt_booked = true; patch.appt_attended = true }
  if (status === 'No show') { patch.appt_booked = true; patch.appt_attended = false }
  if (status === 'Sold') { patch.sold = true; if (extra?.revenue != null) patch.revenue = extra.revenue }
  const { error } = await supabase.from('leads').update(patch).eq('id', leadId)
  if (error) throw error
  await supabase.from('lead_outcomes').insert({ lead_id: leadId, status, notes: extra?.notes || null })
  if (status === 'Appointment booked' || status === 'Appointment attended' || status === 'No show') {
    await supabase.from('appointments').insert({
      lead_id: leadId, appt_date: extra?.appt_date || null,
      showed_up: status === 'Appointment attended' ? true : status === 'No show' ? false : null,
    })
  }
  if (status === 'Sold') {
    await supabase.from('sales_outcomes').insert({ lead_id: leadId, product: extra?.product || null, sold: true, amount: extra?.revenue ?? null, revenue: extra?.revenue ?? null, reason_bought: extra?.reason || null })
  }
}
