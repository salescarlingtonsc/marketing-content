import type { HookFormula } from '../types'

// Bundled copy of the seeded hook library — used as a fallback if the DB read
// fails so the generator always works offline.
export const FALLBACK_HOOKS: HookFormula[] = [
  { category: 'Curiosity', formula: 'The real reason [X] happens...', why: 'opens a curiosity gap' },
  { category: 'Fear', formula: 'If you [X], you are losing [Y]', why: 'loss aversion' },
  { category: 'Mistake', formula: 'Stop [doing X]', why: 'pattern break + loss aversion' },
  { category: 'Contrarian', formula: 'Everyone says [X]. They are wrong.', why: 'pattern interrupt + ego' },
  { category: 'Before/After', formula: 'From [A] to [B] in [time]', why: 'transformation / aspiration' },
  { category: 'Status', formula: 'What [top group] do differently', why: 'aspiration' },
  { category: 'Money', formula: 'How I or they made or saved [amount]', why: 'specificity' },
  { category: 'Lifestyle', formula: '[dream scene] - here is how', why: 'identity' },
  { category: 'Identity', formula: 'If you are a [audience]...', why: 'relevance / identity' },
  { category: 'Pain-point', formula: '[name the pain in 3 words]', why: 'instant relevance' },
  { category: 'Secret reveal', formula: 'Nobody tells you this about [X]', why: 'insider / curiosity' },
  { category: 'Case study', formula: 'How [name] got [result]', why: 'proof' },
  { category: 'Authority', formula: 'I have done [N]; here is the number 1 lesson', why: 'trust' },
  { category: 'Comparison', formula: '[A] vs [B]: which wins', why: 'decision aid' },
  { category: 'Most get wrong', formula: 'Most people get [X] wrong', why: 'ego + curiosity' },
  { category: 'If you are [audience]', formula: 'If you are [X], watch this', why: 'targeting' },
  { category: 'Wish I knew', formula: 'I wish I knew this at [stage]', why: 'regret / relatability' },
  { category: 'Stop doing this', formula: 'Stop [common behaviour]', why: 'loss aversion' },
  { category: 'Why not working', formula: 'This is why [X] is not working', why: 'diagnosis' },
]
