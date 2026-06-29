export type Goal = 'lead' | 'appointment' | 'sale' | 'followers'

export interface Intake {
  company: string
  industry: string
  audience: string
  pain: string
  desire: string
  offer: string
  price: string
  platform: string
  goal: Goal
  regulated: boolean
}

export interface HookFormula {
  category: string
  formula: string
  why: string
}

export interface ScoredHook {
  category: string
  why: string
  text: string
  score: number
  band: string
  breakdown: { factor: string; points: number }[]
  flags: string[]
}

export interface CalendarItem {
  day: number
  pillar: string
  format: string
  hook: string
}

export interface GenerationResult {
  hooks: ScoredHook[]
  calendar: CalendarItem[]
  leadFormQuestions: string[]
  disclaimers: string[]
  complianceFlags: string[]
}
