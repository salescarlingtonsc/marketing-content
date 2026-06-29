# Finance GTM — Compliance + Tracking (the safety layer)

Makes finance/insurance/ILP lead-gen both legal and quality-optimised. All claims here are research-grade — **get a lawyer to sign off the consent wording + disclaimers before live spend.**

## SG PDPA Do-Not-Call (DNC) — fixes the "call HOT lead in <5 min" landmine
Marketing voice calls / SMS to SG numbers on the DNC registry are prohibited — the rules explicitly cover "business or investment opportunities" (= ILP/insurance). Penalty: up to **S$1M or 10% of SG turnover**. **Fix:** you do NOT need a DNC check if you hold clear, unambiguous consent covering (a) collection of the number AND (b) marketing contact. So the lead form must capture explicit consent → instant <5-min call/WhatsApp is legal and keeps the speed-to-lead edge. Without consent: scrub against DNC (check valid ≤30 days before contacting). SMS also needs Spam Control Act compliance (consent or DNC-clear + sender ID + working opt-out).

**Lead-form consent line (adapt with lawyer):** "☐ I consent to [Company/Adviser] contacting me by call, SMS and WhatsApp about [products/services] and to collecting my number for this purpose. I can withdraw anytime."

## MAS Digital Advertising Guidelines (effective 25 Mar 2026)
Hold the financial institution + Board accountable for ALL content incl. agency/affiliate/finfluencer posts; outsourcing does not transfer liability; sponsored content must be FI-approved + disclose compensation. Content must be **education, not advice**; no guarantees/returns; "past performance is not indicative of future results"; FNA before any recommendation.

## Meta CAPI offline-conversion — fixes "Meta optimises for cheap leads"
In finance the sale closes weeks later, off-platform. Use Conversions API for CRM + the "Conversion Leads" goal; push offline events back (lead_qualified, appointment_booked, FNA_done, policy_signed). Map `lead.score >= 60` → "Marketing Quality Lead" event; `sold = true` → "Purchase" with value. Optimises for real customers; reported ~15% lower cost-per-quality-lead.

## Safe finance funnel
Compliant lead form (qualifying Qs + explicit consent) → instant consented call <5 min → FNA before any recommendation → education-not-advice content w/ disclaimers + FI approval → CRM fires offline conversions back to Meta → CPQL optimised. UTM on every link; minimise PII (never log name/phone in analytics).
