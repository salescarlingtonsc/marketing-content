import type { GenerationResult, HookFormula, Intake, ScoredHook, CalendarItem } from '../types'
import { scoreHook } from './score'

const STOP = new Set(['in', 'of', 'the', 'a', 'an', 'for', 'to', 'with', 'and', 'or', 'on', 'at', 'your', 'my', 'if'])
const short = (s: string, n = 6) => {
  const w = s.split(/\s+/).filter(Boolean).slice(0, n)
  while (w.length && STOP.has(w[w.length - 1].toLowerCase())) w.pop()
  return w.join(' ')
}
const lc = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s)

// Clean, readable generation templates keyed by hook category. Fall back to a
// generic slot-fill of the library formula for any category without one.
const TEMPLATES: Record<string, (i: Intake) => string> = {
  Curiosity: (i) => `The real reason ${short(i.audience, 4)} struggle with ${lc(short(i.pain, 5))}`,
  Fear: (i) => `If you ignore ${lc(short(i.pain, 5))}, you could be losing ${lc(short(i.desire, 5))}`,
  Mistake: (i) => `Stop making this ${short(i.offer, 3)} mistake: ${lc(short(i.pain, 5))}`,
  Contrarian: (i) => `Everyone tells ${short(i.audience, 4)} the same advice. Here is why it is wrong`,
  'Before/After': (i) => `From ${lc(short(i.pain, 4))} to ${lc(short(i.desire, 4))} — here is the path`,
  Status: (i) => `What the top ${short(i.audience, 3)} do differently about ${lc(short(i.offer, 4))}`,
  Money: (i) => `How ${short(i.audience, 4)} can reach ${lc(short(i.desire, 4))} (the ${i.price} question)`,
  Identity: (i) => `If you are ${short(i.audience, 5)}, watch this before you decide`,
  'If you are [audience]': (i) => `If you are ${short(i.audience, 5)}, this is for you`,
  'Pain-point': (i) => `${short(i.pain, 4)}?`,
  'Secret reveal': (i) => `Nobody tells ${short(i.audience, 4)} this about ${lc(short(i.offer, 4))}`,
  'Case study': (i) => `How one ${short(i.audience, 3)} went from ${lc(short(i.pain, 3))} to ${lc(short(i.desire, 3))}`,
  Authority: (i) => `After helping ${short(i.audience, 4)} with ${lc(short(i.offer, 4))}, here is the number 1 mistake`,
  Comparison: (i) => `Doing it yourself vs ${short(i.offer, 4)}: what ${short(i.audience, 3)} should know`,
  'Most get wrong': (i) => `Most ${short(i.audience, 4)} get ${lc(short(i.offer, 4))} wrong — here is the fix`,
  'Stop doing this': (i) => `Stop ${lc(short(i.pain, 5))} if you want ${lc(short(i.desire, 4))}`,
  'Why not working': (i) => `This is why ${short(i.audience, 4)} are not getting ${lc(short(i.desire, 4))}`,
  'Wish I knew': (i) => `I wish ${short(i.audience, 3)} knew this sooner about ${lc(short(i.offer, 4))}`,
  Lifestyle: (i) => `${short(i.desire, 5)} — here is how`,
}

function genericFill(formula: string, i: Intake): string {
  return formula
    .replace(/\[audience\]/gi, short(i.audience, 4))
    .replace(/\[name the pain in 3 words\]/gi, short(i.pain, 3))
    .replace(/\[common behaviour\]/gi, lc(short(i.pain, 5)))
    .replace(/\[doing X\]/gi, lc(short(i.pain, 5)))
    .replace(/\[dream scene\]/gi, short(i.desire, 5))
    .replace(/\[top group\]/gi, `top ${short(i.audience, 2)}`)
    .replace(/\[amount\]/gi, i.price || 'this')
    .replace(/\[result\]/gi, lc(short(i.desire, 4)))
    .replace(/\[name\]/gi, `a ${short(i.audience, 2)}`)
    .replace(/\[stage\]/gi, 'the start')
    .replace(/\[time\]/gi, '90 days')
    .replace(/\[N\]/gi, 'many clients')
    .replace(/\[A\]/gi, lc(short(i.pain, 3)))
    .replace(/\[B\]/gi, lc(short(i.desire, 3)))
    .replace(/\[Y\]/gi, lc(short(i.desire, 4)))
    .replace(/\[X\]/gi, lc(short(i.offer || i.pain, 4)))
}

const PILLARS = ['Authority/education', 'Trust/proof', 'Personality/founder', 'Offer/lead-gen']

export function generateCampaign(
  intake: Intake,
  formulas: HookFormula[],
  banned: string[],
  disclaimers: string[],
): GenerationResult {
  const hooks: ScoredHook[] = formulas.map((f) => {
    const text = (TEMPLATES[f.category]?.(intake) ?? genericFill(f.formula, intake)).trim()
    const scored = scoreHook(text, intake, banned)
    scored.category = f.category
    scored.why = f.why
    return scored
  })

  hooks.sort((a, b) => b.score - a.score)

  // 7-day calendar from the top hooks, rotated across the 4 pillars (~40/30/20/10).
  const calendar: CalendarItem[] = hooks.slice(0, 7).map((h, idx) => ({
    day: idx + 1,
    pillar: PILLARS[idx % PILLARS.length],
    format: idx % 3 === 0 ? '30s talking-head' : idx % 3 === 1 ? '3-mistakes list' : 'POV / story',
    hook: h.text,
  }))

  const leadFormQuestions = buildLeadForm(intake)

  const complianceFlags = Array.from(new Set(hooks.flatMap((h) => h.flags)))

  return {
    hooks,
    calendar,
    leadFormQuestions,
    disclaimers: intake.regulated ? disclaimers : [],
    complianceFlags,
  }
}

function buildLeadForm(i: Intake): string[] {
  const base: string[] = []
  if (i.regulated) {
    base.push(
      'What is your approximate monthly savings range?',
      'When are you looking to get started? (now / 1-3 months / just exploring)',
      'What is your occupation?',
      'CONSENT: I agree to be contacted by call, SMS and WhatsApp about this. (required to enable instant follow-up — PDPA)',
    )
  } else {
    base.push(
      `What is your main goal with ${short(i.offer, 4)}?`,
      'What is your timeline?',
      'What is your budget range?',
    )
  }
  if (i.goal === 'appointment' || i.goal === 'sale') {
    base.push('Are you open to a short Zoom / call this week? (yes / no)')
  }
  return base
}
