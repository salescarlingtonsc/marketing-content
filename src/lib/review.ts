import { supabase } from './supabase'
import { outlierScore, verdictFor } from './posts'
import type { Intake, ScoredHook } from '../types'

// Approval workflow (migration 0012). generate → pending_approval → approved/rejected.
// Approved posts are downloadable as a per-post content pack; after the human posts it,
// performance is logged in ContentView (existing flow) which closes the loop.

export interface ReviewPost {
  id: string
  hook?: string | null
  caption?: string | null
  script?: string | null
  cta?: string | null
  platform?: string | null
  status?: string | null
  scheduled_at?: string | null
  media_url?: string | null
  rejected_reason?: string | null
  created_at?: string
}

// Postgres 42703 = undefined column → migration 0012 not applied yet.
const MIGRATION_HINT =
  'Approval columns missing — run supabase/migrations/0012_post_approval.sql in the Supabase SQL editor first.'

function explain(error: { code?: string; message?: string }): Error {
  if (error.code === '42703' || /column .* does not exist/i.test(error.message ?? '')) {
    return new Error(MIGRATION_HINT)
  }
  return new Error(error.message ?? 'unknown error')
}

// Next 6PM SGT (UTC+8, no DST) as the default schedule slot.
export function next6pmSGT(from = new Date()): Date {
  const sgNow = new Date(from.getTime() + 8 * 3600_000) // shift to SGT wall-clock
  const slot = new Date(sgNow)
  slot.setUTCHours(18, 0, 0, 0)
  if (slot <= sgNow) slot.setUTCDate(slot.getUTCDate() + 1)
  return new Date(slot.getTime() - 8 * 3600_000) // back to real UTC instant
}

export interface SendToReviewInput {
  intake: Intake
  hooks: ScoredHook[]
  caption?: string | null
  script?: string | null
  cta?: string | null
  count?: number
}

export async function sendToReview(input: SendToReviewInput): Promise<number> {
  const top = input.hooks.slice(0, input.count ?? 3)
  if (!top.length) throw new Error('No hooks to send — generate a campaign first.')
  const scheduled = next6pmSGT()
  const rows = top.map((h, i) => ({
    hook: h.text,
    platform: input.intake.platform || 'TikTok',
    status: 'pending_approval',
    caption: input.caption ?? null,
    script: input.script ?? null,
    cta: input.cta ?? null,
    // stagger daily at 6PM SGT
    scheduled_at: new Date(scheduled.getTime() + i * 86_400_000).toISOString(),
  }))
  const { error } = await supabase.from('posts').insert(rows)
  if (error) throw explain(error)
  return rows.length
}

export async function listReview(): Promise<ReviewPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id,hook,caption,script,cta,platform,status,scheduled_at,media_url,rejected_reason,created_at')
    .in('status', ['pending_approval', 'approved', 'rejected', 'posted'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw explain(error)
  return (data ?? []) as ReviewPost[]
}

export async function saveEdits(id: string, fields: Partial<Pick<ReviewPost, 'hook' | 'caption' | 'script' | 'cta' | 'scheduled_at'>>) {
  const { error } = await supabase.from('posts').update(fields).eq('id', id)
  if (error) throw explain(error)
}

export async function approvePost(id: string) {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('posts')
    .update({ status: 'approved', approved_by: u.user?.id ?? null, approved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw explain(error)
}

export async function rejectPost(id: string, reason: string) {
  const { error } = await supabase
    .from('posts')
    .update({ status: 'rejected', rejected_reason: reason || null })
    .eq('id', id)
  if (error) throw explain(error)
}

export async function markPosted(id: string, url: string) {
  const { error } = await supabase
    .from('posts')
    .update({ status: 'posted', url: url || null, posted_at: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
  if (error) throw explain(error)
}

// 48h numbers land on the SAME row (not a duplicate) so attribution stays whole.
export async function logPerformance(
  id: string,
  n: { views_48h?: number | null; account_avg_48h?: number | null; saves?: number | null; shares?: number | null; comments?: number | null },
) {
  const o = outlierScore(n.views_48h ?? null, n.account_avg_48h ?? null)
  const { error } = await supabase
    .from('posts')
    .update({ ...n, outlier_score: o, verdict: verdictFor(o) })
    .eq('id', id)
  if (error) throw explain(error)
}
