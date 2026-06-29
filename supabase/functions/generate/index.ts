// Edge function: AI campaign generation via Google Gemini Flash.
// The API key lives ONLY here as a secret (Deno env), never in the browser or git.
// Set it with:  supabase secrets set GEMINI_API_KEY=...  (or in the dashboard)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM = `You are a top-1% growth strategist and short-form copywriter.
Write specific, non-generic, scroll-stopping hooks. House standard: a hook must land its promise fast, read at a 5th-8th grade level, and use plain language.
Separate education from recommendation. NEVER output guarantees, promised returns, or financial advice.
If the business is regulated (finance/insurance), keep everything educational and add no claims of certainty.
Return STRICT JSON only.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    return new Response(
      JSON.stringify({ error: 'no_key', message: 'AI mode not configured yet: GEMINI_API_KEY is not set on this project.' }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { intake } = await req.json()
    const i = intake ?? {}
    const prompt = `${SYSTEM}

Business: ${i.company} | Industry: ${i.industry} | Regulated: ${i.regulated ? 'YES' : 'no'}
Audience: ${i.audience}
Top pain: ${i.pain}
Top desire: ${i.desire}
Offer: ${i.offer} | Price: ${i.price} | Platform: ${i.platform} | Goal: ${i.goal}

Task: produce 10 distinct short-form video hooks for this business across varied angles
(curiosity, fear/loss, mistake, contrarian, identity, before/after, secret, case study, comparison, "most get this wrong").
Also produce ONE 21-34s script for the strongest hook (hook, context, re-hook, payoff, CTA).
Return JSON exactly: {"hooks":[{"category":string,"text":string}],"script":{"hook":string,"context":string,"rehook":string,"payoff":string,"cta":string}}`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      }),
    })

    if (!r.ok) {
      const detail = await r.text()
      return new Response(JSON.stringify({ error: 'gemini_error', status: r.status, detail: detail.slice(0, 500) }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { parsed = { raw: text } }

    return new Response(JSON.stringify(parsed), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'bad_request', message: String(e) }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
