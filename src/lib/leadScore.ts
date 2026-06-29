// Configurable lead scoring. Weights/bands/cutoffs come from a scoring_config
// (DB row) so other verticals can have different logic. Default = investment/SG.

export interface ScoringConfig {
  id?: string
  vertical: string
  name?: string
  weights: Record<string, number>
  bands: any
  tier_cutoffs: { hot: number; warm: number; nurture: number }
}

export const DEFAULT_INVESTMENT_CONFIG: ScoringConfig = {
  vertical: 'investment',
  name: 'Default - Investment/Insurance (SG)',
  weights: { monthly_savings: 30, age_fit: 15, occupation: 12, investing_experience: 8, response_speed: 10, appt_willingness: 10, giveaway_only_penalty: 15 },
  bands: { savings: { high: 1000, mid: 500 }, age: { primeMin: 25, primeMax: 45, youngMax: 24, oldMin: 55 } },
  tier_cutoffs: { hot: 80, warm: 60, nurture: 40 },
}

export interface LeadLike {
  monthly_savings?: number | null
  savings_band?: string | null
  age?: number | null
  birth_year?: number | null
  occupation?: string | null
  investing_experience?: string | null
  response_time_min?: number | null
  status?: string | null
  prize?: string | null
  manual_override?: number | null
}

const HIGH_INCOME = ['director', 'manager', 'engineer', 'doctor', 'lawyer', 'founder', 'ceo', 'cfo', 'vp', 'consultant', 'pilot', 'specialist', 'architect', 'pharmacist', 'dentist', 'executive', 'banker', 'accountant', 'professor']

export function computeLeadScore(lead: LeadLike, cfg: ScoringConfig = DEFAULT_INVESTMENT_CONFIG) {
  const w = cfg.weights || {}
  const b = cfg.bands || {}
  const breakdown: Record<string, number> = {}

  const age = lead.age ?? (lead.birth_year ? new Date().getFullYear() - lead.birth_year : null)
  const savings = lead.monthly_savings ??
    (lead.savings_band === '1k+' ? 1000 : lead.savings_band === '500-1k' ? 600 : lead.savings_band === '<500' ? 300 : null)

  const sHigh = b.savings?.high ?? 1000, sMid = b.savings?.mid ?? 500
  breakdown.monthly_savings = Math.round((w.monthly_savings ?? 0) *
    (savings == null ? 0.33 : savings >= sHigh ? 1 : savings >= sMid ? 0.6 : 0.2))

  const a = b.age || {}
  let afMult: number
  if (age == null) afMult = 0.4
  else if (age >= (a.primeMin ?? 25) && age <= (a.primeMax ?? 45)) afMult = 1
  else if (age <= (a.youngMax ?? 24)) afMult = 0.4
  else if (age >= (a.oldMin ?? 55)) afMult = 0.3
  else afMult = 0.6
  breakdown.age_fit = Math.round((w.age_fit ?? 0) * afMult)

  const occ = (lead.occupation || '').toLowerCase()
  breakdown.occupation = Math.round((w.occupation ?? 0) *
    (!occ ? 0.3 : HIGH_INCOME.some((k) => occ.includes(k)) ? 1 : 0.6))

  const exp = (lead.investing_experience || '').toLowerCase()
  breakdown.investing_experience = Math.round((w.investing_experience ?? 0) *
    (!exp ? 0.5 : /none|never|beginner|^no/.test(exp) ? 0.5 : 1))

  const r = lead.response_time_min
  breakdown.response_speed = Math.round((w.response_speed ?? 0) *
    (r == null ? 0.5 : r < 5 ? 1 : r < 60 ? 0.7 : r < 1440 ? 0.4 : 0.2))

  const st = (lead.status || '').toLowerCase()
  breakdown.appt_willingness = Math.round((w.appt_willingness ?? 0) *
    (/appointment|booked|attended|qualified|sold/.test(st) ? 1 : /replied|contacted/.test(st) ? 0.6 : 0.4))

  // giveaway-only penalty: prize present but no quality signal at all
  const giveawayOnly = !!lead.prize && savings == null && !occ
  breakdown.giveaway_only_penalty = giveawayOnly ? -(w.giveaway_only_penalty ?? 0) : 0

  let score = Object.values(breakdown).reduce((s, x) => s + x, 0)
  if (lead.manual_override != null) score = lead.manual_override
  score = Math.max(0, Math.min(100, Math.round(score)))

  const cut = cfg.tier_cutoffs || { hot: 80, warm: 60, nurture: 40 }
  let tier: string
  if (giveawayOnly && score < cut.nurture) tier = 'giveaway-only'
  else if (score >= cut.hot) tier = 'hot'
  else if (score >= cut.warm) tier = 'warm'
  else if (score >= cut.nurture) tier = 'nurture'
  else tier = 'trash'

  return { score, tier, breakdown }
}
