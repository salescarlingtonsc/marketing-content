import type { GenerationResult, Intake, ScoredHook } from '../types'

// Content Pack Export — bundles the current generation into a downloadable zip of
// platform-ready text assets. Client/VA downloads → posts manually. Zero API, zero cost.
// NOTE: this app generates TEXT only (no media). We never fabricate a media file;
// attach the render/video separately.

interface AIScript { hook?: string; context?: string; rehook?: string; payoff?: string; cta?: string }
interface AIExtras {
  adCopy?: { primaryText?: string; headline?: string; description?: string }
  leadMagnet?: { title?: string; description?: string; filters?: string }
  followUp?: { channel?: string; timing?: string; message?: string }[]
  objections?: { objection?: string; response?: string }[]
}

export interface PackInput {
  intake: Intake
  result: GenerationResult | null
  aiHooks: ScoredHook[]
  aiScript: AIScript | null
  aiExtra: AIExtras | null
}

const POST_TIME = 'Recommended post time: 6:00 PM SGT · best days Tue–Thu + Sun'

function slug(s: string) {
  return (s || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

// Suggested hashtags derived from the intake (cross-industry — NOT hardcoded).
// Labelled as suggestions so the client edits before posting.
function suggestHashtags(i: Intake): string[] {
  const stop = new Set(['with', 'your', 'that', 'this', 'from', 'they', 'have', 'free', 'about', 'their', 'what', 'when', 'will'])
  const words = `${i.industry} ${i.audience} ${i.offer}`.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))
  return Array.from(new Set(words)).slice(0, 7).map((w) => '#' + w)
}

function topHook(p: PackInput): string {
  return p.aiHooks[0]?.text ?? p.result?.hooks?.[0]?.text ?? ''
}

function captionTxt(p: PackInput): string {
  const hook = topHook(p)
  const body = p.aiExtra?.adCopy?.primaryText ?? ''
  const cta = p.aiScript?.cta ?? p.aiExtra?.adCopy?.description ?? 'DM us to get started.'
  const tags = suggestHashtags(p.intake).join(' ')
  return [
    hook,
    '',
    body,
    '',
    cta,
    '',
    '— suggested hashtags (edit before posting) —',
    tags,
  ].filter((l) => l !== undefined).join('\n').trim() + '\n'
}

function scriptTxt(p: PackInput): string {
  const s = p.aiScript
  if (s && (s.hook || s.payoff)) {
    return [
      'SHORT-FORM SCRIPT (record or feed to AI video gen)',
      '',
      `[HOOK ≤1.7s]  ${s.hook ?? ''}`,
      `[CONTEXT]     ${s.context ?? ''}`,
      `[RE-HOOK]     ${s.rehook ?? ''}`,
      `[PAYOFF]      ${s.payoff ?? ''}`,
      `[CTA]         ${s.cta ?? ''}`,
    ].join('\n') + '\n'
  }
  // fallback: no AI script → give the top hooks as a shot list
  const hooks = (p.aiHooks.length ? p.aiHooks : p.result?.hooks ?? []).slice(0, 5)
  return ['SHOT LIST (no AI script generated — build around the top hooks):', '',
    ...hooks.map((h, i) => `${i + 1}. ${h.text}`)].join('\n') + '\n'
}

function hooksTxt(p: PackInput): string {
  const hooks = (p.aiHooks.length ? p.aiHooks : p.result?.hooks ?? []).slice(0, 10)
  if (!hooks.length) return 'No hooks generated.\n'
  return ['RANKED HOOKS (score /100)', '', ...hooks.map((h) => `[${h.score}] ${h.text}   (${h.category})`)].join('\n') + '\n'
}

function scheduleTxt(p: PackInput): string {
  const cal = p.result?.calendar ?? []
  const lines = ['POSTING SCHEDULE', '', POST_TIME, '']
  if (cal.length) {
    lines.push('7-DAY CALENDAR:')
    for (const c of cal) lines.push(`Day ${c.day} · ${c.pillar} · ${c.format} — ${c.hook}`)
  } else {
    lines.push('(Generate with rules mode for the 7-day calendar.)')
  }
  return lines.join('\n') + '\n'
}

function followUpTxt(p: PackInput): string | null {
  const seq = p.aiExtra?.followUp ?? []
  const obj = p.aiExtra?.objections ?? []
  if (!seq.length && !obj.length) return null
  const lines: string[] = []
  if (seq.length) {
    lines.push('FOLLOW-UP SEQUENCE', '')
    seq.forEach((s, i) => lines.push(`${i + 1}. [${s.channel ?? ''} · ${s.timing ?? ''}] ${s.message ?? ''}`))
    lines.push('')
  }
  if (obj.length) {
    lines.push('OBJECTION HANDLING', '')
    obj.forEach((o) => lines.push(`"${o.objection ?? ''}" → ${o.response ?? ''}`))
  }
  return lines.join('\n') + '\n'
}

function complianceTxt(p: PackInput): string | null {
  const disc = p.result?.disclaimers ?? []
  const flags = p.result?.complianceFlags ?? []
  if (!disc.length && !flags.length) return null
  const lines: string[] = []
  if (flags.length) { lines.push('⚠️ COMPLIANCE FLAGS — review before posting:', '', ...flags.map((f) => '· ' + f), '') }
  if (disc.length) { lines.push('REQUIRED DISCLAIMERS (must appear):', '', ...disc.map((d) => '· ' + d)) }
  return lines.join('\n') + '\n'
}

export async function buildContentPackZip(p: PackInput): Promise<Blob> {
  const { default: JSZip } = await import('jszip') // lazy — only loads when a pack is downloaded
  const zip = new JSZip()
  const date = new Date().toISOString().slice(0, 10)
  zip.file('README.txt', [
    `CONTENT PACK — ${p.intake.company}`,
    `Generated ${date} · Super Marketing Brain`,
    '',
    'Files: caption.txt (post text + hashtags), script.txt, hooks.txt, schedule.txt' +
      (followUpTxt(p) ? ', follow-up.txt' : '') + (complianceTxt(p) ? ', compliance.txt' : ''),
    '',
    'This pack is TEXT only. Attach your video/render separately, then post per schedule.txt.',
  ].join('\n') + '\n')
  zip.file('caption.txt', captionTxt(p))
  zip.file('script.txt', scriptTxt(p))
  zip.file('hooks.txt', hooksTxt(p))
  zip.file('schedule.txt', scheduleTxt(p))
  const fu = followUpTxt(p); if (fu) zip.file('follow-up.txt', fu)
  const co = complianceTxt(p); if (co) zip.file('compliance.txt', co)
  return zip.generateAsync({ type: 'blob' })
}

// Single-post pack for the approval flow: one approved post → one zip a VA/client
// can post from directly.
export interface PostPackInput {
  hook?: string | null
  caption?: string | null
  script?: string | null
  cta?: string | null
  platform?: string | null
  scheduled_at?: string | null
}

export async function downloadPostPack(p: PostPackInput): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const when = p.scheduled_at
    ? new Date(p.scheduled_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' }) + ' SGT'
    : POST_TIME
  zip.file('caption.txt', [p.hook ?? '', '', p.caption ?? '', '', p.cta ?? ''].join('\n').trim() + '\n')
  zip.file('script.txt', (p.script && p.script.trim()) ? p.script + '\n' : `Build the video around this hook (on screen by 1.7s):\n\n${p.hook ?? ''}\n`)
  zip.file('schedule.txt', [`Platform: ${p.platform ?? 'TikTok'}`, `Post at: ${when}`].join('\n') + '\n')
  zip.file('README.txt', 'Post pack — attach your video/render, paste caption.txt, post at the time in schedule.txt.\n')
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `post-${slug(p.hook ?? 'post')}.zip`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadContentPack(p: PackInput): Promise<void> {
  const blob = await buildContentPackZip(p)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `content-pack-${slug(p.intake.company)}-${new Date().toISOString().slice(0, 10)}.zip`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
