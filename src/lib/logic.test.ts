import { describe, it, expect } from 'vitest'
import { parseSavings, bandFromSavings } from './csv'
import { computeLeadScore } from './leadScore'
import { aggregateBy, recommendations, ageBand } from './insights'
import { outlierScore, verdictFor } from './posts'

describe('parseSavings (Meta/TikTok text answers)', () => {
  it('bands ranges by their floor', () => {
    expect(parseSavings('$500-$1,000').band).toBe('500-1k')
    expect(parseSavings('More than $1,000').band).toBe('1k+')
    expect(parseSavings('Below $500').band).toBe('<500')
    expect(parseSavings('2k').band).toBe('1k+')
    expect(parseSavings('').band).toBe('unknown')
  })
  it('bandFromSavings buckets numbers', () => {
    expect(bandFromSavings(1500)).toBe('1k+')
    expect(bandFromSavings(600)).toBe('500-1k')
    expect(bandFromSavings(300)).toBe('<500')
    expect(bandFromSavings(null)).toBe('unknown')
  })
})

describe('computeLeadScore', () => {
  it('scores a prime saver high (hot/warm) and trash low', () => {
    const hot = computeLeadScore({ monthly_savings: 1500, age: 35, occupation: 'engineer', response_time_min: 3, status: 'Replied' })
    expect(hot.score).toBeGreaterThanOrEqual(60)
    const trash = computeLeadScore({ monthly_savings: 200, age: 21 })
    expect(trash.tier).toBe('trash')
  })
  it('flags giveaway-only when prize present but no quality signal', () => {
    const g = computeLeadScore({ prize: 'PS5', age: 22 })
    expect(g.tier).toBe('giveaway-only')
  })
  it('keeps score within 0..100', () => {
    const r = computeLeadScore({ monthly_savings: 99999, age: 35, occupation: 'doctor' })
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.score).toBeGreaterThanOrEqual(0)
  })
})

describe('dashboard aggregate + recommendations', () => {
  const leads: any[] = []
  for (let i = 0; i < 30; i++) leads.push({ campaign_id: 'ps5', prize: 'PS5', savings_band: i < 4 ? '1k+' : '<500', score: i < 4 ? 75 : 30, appt_booked: i < 5, appt_attended: i < 3, sold: i === 0, revenue: i === 0 ? 2000 : 0, age: 22 })
  for (let i = 0; i < 25; i++) leads.push({ campaign_id: 'dyson', prize: 'Dyson Airwrap', savings_band: i < 14 ? '1k+' : '500-1k', score: i < 16 ? 78 : 55, appt_booked: i < 12, appt_attended: i < 9, sold: i < 3, revenue: i < 3 ? 3000 : 0, age: 34 })
  const spend = { ps5: 300, dyson: 600 }

  it('computes CPQL correctly (PS5 cheaper CPL but worse CPQL than Dyson)', () => {
    const g = aggregateBy(leads, (l) => l.campaign_id, spend, true)
    const ps5 = g.find((x) => x.key === 'ps5')!
    const dyson = g.find((x) => x.key === 'dyson')!
    expect(ps5.cpl!).toBeLessThan(dyson.cpl!)      // PS5 cheaper per lead
    expect(ps5.cpql!).toBeGreaterThan(dyson.cpql!) // but worse per QUALITY lead
  })
  it('recommends scaling the better-CPQL campaign and flags the trashy prize', () => {
    const recs = recommendations(
      aggregateBy(leads, (l) => l.campaign_id, spend, true),
      aggregateBy(leads, (l) => l.prize, spend),
      aggregateBy(leads, (l) => ageBand(l.age), spend),
    )
    expect(recs.some((r) => r.type === 'scale' && r.target.includes('dyson'))).toBe(true)
    expect(recs.some((r) => r.type === 'flag trash' && r.target.includes('PS5'))).toBe(true)
  })
})

describe('Outlier Score + verdict', () => {
  it('computes ratio and bands the verdict', () => {
    expect(outlierScore(2000, 1000)).toBe(200)
    expect(verdictFor(200)).toBe('clone angle')
    expect(verdictFor(50)).toBe('kill')
    expect(outlierScore(100, 0)).toBeNull()
  })
})
