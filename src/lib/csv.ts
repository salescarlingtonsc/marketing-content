// Minimal CSV parser (quoted fields, commas, CRLF). No dependency.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { cur.push(field); field = '' }
      else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = '' }
      else if (ch !== '\r') field += ch
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur) }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (!nonEmpty.length) return []
  const headers = nonEmpty[0].map((h) => h.trim())
  return nonEmpty.slice(1).map((r) => {
    const o: Record<string, string> = {}
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim() })
    return o
  })
}

// Meta forms often store savings as free text ("More than $1,000", "$500-$1,000").
export function parseSavings(raw: string | undefined): { value: number | null; band: string } {
  if (!raw) return { value: null, band: 'unknown' }
  const s = raw.toLowerCase().replace(/[, ]/g, '')
  let val: number | null = null
  const kMatch = s.match(/(\d+(\.\d+)?)k/)
  if (kMatch) val = Number(kMatch[1]) * 1000
  const nums = (s.match(/\d+(\.\d+)?/g) || []).map(Number)
  if (nums.length) val = Math.max(val ?? 0, ...nums)
  let band = 'unknown'
  if (val != null) band = val >= 1000 ? '1k+' : val >= 500 ? '500-1k' : '<500'
  else if (/morethan|above|high|>|\+/.test(s)) band = '1k+'
  return { value: val, band }
}

export function bandFromSavings(v: number | null | undefined): string {
  if (v == null) return 'unknown'
  return v >= 1000 ? '1k+' : v >= 500 ? '500-1k' : '<500'
}
