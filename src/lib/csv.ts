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
  const norm = raw.toLowerCase().replace(/[,\s$]/g, '')
  // collect numbers, expanding a trailing "k" (e.g. 2k -> 2000)
  const nums: number[] = []
  const re = /(\d+(?:\.\d+)?)(k)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(norm))) nums.push(Number(m[1]) * (m[2] ? 1000 : 1))
  if (!nums.length) {
    if (/morethan|above|over|high/.test(norm)) return { value: null, band: '1k+' }
    return { value: null, band: 'unknown' }
  }
  // A range ("$500-$1,000") bands by its FLOOR; "below/under X" bands just under X;
  // a single/"more than" number is treated as a floor. Fixes ranges banding upward.
  const isRange = nums.length >= 2
  const isBelow = /below|under|lessthan|upto|max|fewer|</.test(norm)
  const driver = isRange ? Math.min(...nums) : isBelow ? nums[0] - 1 : nums[0]
  const value = Math.max(...nums)
  const band = driver >= 1000 ? '1k+' : driver >= 500 ? '500-1k' : '<500'
  return { value, band }
}

export function bandFromSavings(v: number | null | undefined): string {
  if (v == null) return 'unknown'
  return v >= 1000 ? '1k+' : v >= 500 ? '500-1k' : '<500'
}
