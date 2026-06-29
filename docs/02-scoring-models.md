# Scoring Models (computed in code over LLM-extracted factors)

## 1) Viral Potential (0–100) — score BEFORE posting
Hook strength 15 · Audience relevance 10 · Pain intensity 10 · Curiosity gap 10 · Emotional trigger 10 · Shareability 8 · Saveability 7 · Visual strength 7 · Authority 6 · Lead-gen potential 7 · Offer alignment 5 · (−) Compliance risk up to −10 · (−) Execution difficulty up to −5.
Bands: 80–100 post/boost · 60–79 fix hook · 40–59 rework · <40 kill. **Hard gate:** any compliance red flag = auto-hold.
**Anchored rubric** (repeatable; two scorers within ±5): each factor scored on 0/mid/max anchors — e.g. Hook 0=generic, max=specific $/outcome promise landing by 1.7s; Curiosity 0=reveals all up front, max=payoff held to last second; Compliance −10=any guarantee/return/advice-before-FNA.
**Validation:** log predicted score vs actual swipe-rate/views; reweight if weak. Post-publish truth metric = **Outlier Score** = (views first 48h ÷ account avg 48h) × 100 → clone breakout topics.

## 2) Lead Quality (0–100) + tiers (finance defaults; calibrate on real data)
Monthly savings 20 · Income proxy 15 · Urgency 12 · Response speed 10 · Appointment willingness 10 · Product fit 10 · Family stage 8 · Age band 5 · Experience 5 · Follow-up engagement 5.
Tiers: **HOT 80–100** call <5 min (with consent) · **WARM 60–79** same day + drip · **NURTURE 40–59** drip/retarget · **TRASH <40/fake** drop · **GIVEAWAY-ONLY** (no qualifying answers) separate list, never sales-called. Prioritise score DESC, then recency.

## 3) Giveaway Prize Fit (0–100)
Mass appeal 10 · Premium signal 10 · Audience fit 15 · Income filter 15 · Gender fit 8 · Age fit 7 · (−) Hunter risk 12 · Viral 8 · Lead-quality 12 · CPL 8 · CPQL 12 · Sales relevance 10.
The prize IS the filter. Pair with 2–4 qualifying Qs + Higher-Intent form + value-add only a real prospect wants. **Optimise CPQL (spend ÷ leads ≥60), not CPL.** Never imply the prize = a financial-product benefit (MAS).

## 4) Campaign Quality (0–100)
CPL 10 · **CPQL 18** · quality-lead ratio 12 · CTR 8 · form-completion 8 · appt rate 10 · show-up 10 · close 12 · revenue 7 · audience fit 5 · creative fit 5 · offer fit 5.

*All weights are calibrated starting points (hypotheses) until tuned on real outcomes.*
