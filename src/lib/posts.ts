import { supabase } from './supabase'

export interface Post {
  id: string
  company_id?: string | null
  campaign_id?: string | null
  hook?: string | null
  platform?: string | null
  url?: string | null
  posted_at?: string | null
  views_48h?: number | null
  account_avg_48h?: number | null
  saves?: number | null
  shares?: number | null
  comments?: number | null
  outlier_score?: number | null
  verdict?: string | null
  created_at?: string
}

// Outlier Score = (48h views ÷ account's average 48h views) × 100.
export function outlierScore(views48h?: number | null, acctAvg48h?: number | null): number | null {
  if (!views48h || !acctAvg48h || acctAvg48h <= 0) return null
  return Math.round((views48h / acctAvg48h) * 100)
}

export function verdictFor(o: number | null): string {
  if (o == null) return 'need data'
  if (o < 80) return 'kill'
  if (o < 150) return 'keep testing'
  if (o < 300) return 'clone angle'
  if (o < 600) return 'boost'
  return 'full campaign'
}

export async function addPost(input: Partial<Post>) {
  const o = outlierScore(input.views_48h ?? null, input.account_avg_48h ?? null)
  const row: any = { ...input, outlier_score: o, verdict: verdictFor(o) }
  const { data, error } = await supabase.from('posts').insert(row).select('id').single()
  if (error) throw error
  return data!.id as string
}

export async function listPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('outlier_score', { ascending: false, nullsFirst: false })
    .limit(500)
  if (error) throw error
  return (data || []) as Post[]
}
