import type { Intake, ScoredHook } from '../types'

const has = (text: string, words: string[]) =>
  words.some((w) => text.toLowerCase().includes(w.toLowerCase()))

const firstWords = (s: string, n: number) =>
  s.split(/\s+/).filter(Boolean).slice(0, n).join(' ')

function band(score: number): string {
  if (score >= 80) return 'post / boost'
  if (score >= 60) return 'fix the hook first'
  if (score >= 40) return 'rework'
  return 'kill'
}

// Anchored Viral Potential rubric (0-100), computed deterministically so two
// runs of the same hook always score the same. Mirrors docs/02-scoring-models.md.
export function scoreHook(text: string, intake: Intake, banned: string[]): ScoredHook {
  const t = text.toLowerCase()
  const audienceKey = firstWords(intake.audience, 2).toLowerCase()
  const offerKey = firstWords(intake.offer, 2).toLowerCase()
  const painKey = firstWords(intake.pain, 2).toLowerCase()

  const b: { factor: string; points: number }[] = []
  const add = (factor: string, points: number) => b.push({ factor, points })

  // Hook strength (15): specific (number/$) + lands fast (short)
  let hook = 0
  if (/\d|\$|%/.test(text)) hook += 8
  if (text.length <= 90) hook += 7
  add('Hook strength', hook)

  // Audience relevance (10)
  add('Audience relevance', audienceKey && t.includes(audienceKey) ? 10 : 4)
  // Pain intensity (10)
  add('Pain intensity', painKey && t.includes(painKey) ? 10 : 4)
  // Curiosity gap (10)
  add('Curiosity gap', has(t, ['real reason', 'nobody', 'most people', 'secret', 'why', 'this is']) ? 10 : 3)
  // Emotional trigger (10): high-arousal / loss
  add('Emotional trigger', has(t, ['losing', 'lose', 'mistake', 'wrong', 'never', 'stop', 'risk', 'too late']) ? 10 : 4)
  // Shareability (8): identity / social currency
  add('Shareability', has(t, ['if you are', 'if you have', 'parents', 'founders', 'owners']) ? 8 : 4)
  // Saveability (7): keepable list / how-to
  add('Saveability', has(t, ['how', 'steps', 'mistakes', 'checklist', 'ways', 'before you']) ? 7 : 3)
  // Visual strength (7): cannot judge from text -> neutral baseline
  add('Visual strength', 4)
  // Authority (6)
  add('Authority', has(t, ['i have', 'reviewed', 'helped', 'years', 'number 1']) ? 6 : 2)
  // Lead-gen potential (7): question / direct call to the viewer
  add('Lead-gen potential', /\?$/.test(text.trim()) || has(t, ['watch this', 'here is how', 'here is']) ? 7 : 4)
  // Offer alignment (5)
  add('Offer alignment', offerKey && t.includes(offerKey) ? 5 : 2)

  // Compliance risk (-10) + execution difficulty (-1 for a text hook)
  const flags: string[] = []
  const hit = banned.filter((p) => t.includes(p.toLowerCase()))
  if (hit.length) flags.push(...hit.map((h) => `banned phrase: "${h}"`))
  add('Compliance risk', hit.length ? -10 : 0)
  add('Execution difficulty', -1)

  if (intake.regulated && /\b(returns?|guarantee|profit|double|grow your money)\b/.test(t) && !hit.length) {
    flags.push('finance: review wording + add disclaimer (education, not advice)')
  }

  let score = b.reduce((s, x) => s + x.points, 0)
  score = Math.max(0, Math.min(100, score))

  return {
    category: '',
    why: '',
    text,
    score,
    band: band(score),
    breakdown: b,
    flags,
  }
}
