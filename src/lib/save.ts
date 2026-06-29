import { supabase } from './supabase'
import type { Intake, ScoredHook } from '../types'

// Persists a generated campaign. Requires an authenticated session (RLS).
export async function saveCampaign(intake: Intake, hooks: ScoredHook[]) {
  const { data: company, error: ce } = await supabase
    .from('companies')
    .insert({
      name: intake.company,
      industry: intake.industry,
      country: 'Singapore',
      compliance_profile: { regulated: intake.regulated },
    })
    .select('id')
    .single()
  if (ce) throw ce

  const rows = hooks.slice(0, 10).map((h) => ({
    company_id: company!.id,
    angle: h.category,
    hook: h.text,
    viral_score: h.score,
    score_breakdown: h.breakdown,
    status: 'draft',
    format: 'short-video',
  }))
  const { error: ie } = await supabase.from('content_ideas').insert(rows)
  if (ie) throw ie

  return { companyId: company!.id as string, count: rows.length }
}

export interface SavedCampaign {
  id: string
  name: string
  industry: string | null
  created_at: string
  content_ideas: { angle: string | null; hook: string | null; viral_score: number | null }[]
}

// Loads saved campaigns (company + its content ideas). Requires auth (RLS).
export async function loadCampaigns(): Promise<SavedCampaign[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,industry,created_at,content_ideas(angle,hook,viral_score)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as SavedCampaign[]
}

