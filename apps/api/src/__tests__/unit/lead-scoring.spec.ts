/**
 * Unit tests for lead scoring from the API perspective.
 * Verifies that the scoring functions imported via @conversionops/ai
 * behave correctly when called from the API package boundary.
 */
import { calculateScore, getTier, calculateScoreDetailed } from '@conversionops/ai';

describe('Lead Scoring via @conversionops/ai', () => {
  describe('calculateScore — dimension weights', () => {
    it('timeline 30_days = 30 pts', () => {
      expect(calculateScore({ timeline: '30_days' }, 0)).toBe(30);
    });

    it('financing pre_approved = 25 pts', () => {
      expect(calculateScore({ financing: 'pre_approved' }, 0)).toBe(25);
    });

    it('financing cash = 25 pts', () => {
      expect(calculateScore({ financing: 'cash' }, 0)).toBe(25);
    });

    it('budget $600k = 20 pts', () => {
      expect(calculateScore({ budget: '600000' }, 0)).toBe(20);
    });

    it('urgency immediate = 15 pts', () => {
      expect(calculateScore({ urgency: 'immediate' }, 0)).toBe(15);
    });

    it('PERFECT lead = 90 pts (30+25+20+15)', () => {
      expect(calculateScore({
        timeline: '30_days',
        financing: 'pre_approved',
        budget: '$600000',
        urgency: 'immediate',
      }, 0)).toBe(90);
    });

    it('PERFECT + max engagement = 100', () => {
      expect(calculateScore({
        timeline: '30_days',
        financing: 'pre_approved',
        budget: '$600000',
        urgency: 'immediate',
      }, 10)).toBe(100);
    });

    it('score never exceeds 100', () => {
      expect(calculateScore({
        timeline: '30_days',
        financing: 'pre_approved',
        budget: '$600000',
        urgency: 'immediate',
      }, 999)).toBe(100);
    });
  });

  describe('getTier — tier boundary enforcement', () => {
    it('80 → PRIORITY', () => expect(getTier(80)).toBe('PRIORITY'));
    it('79 → HOT',      () => expect(getTier(79)).toBe('HOT'));
    it('60 → HOT',      () => expect(getTier(60)).toBe('HOT'));
    it('59 → WARM',     () => expect(getTier(59)).toBe('WARM'));
    it('30 → WARM',     () => expect(getTier(30)).toBe('WARM'));
    it('29 → COLD',     () => expect(getTier(29)).toBe('COLD'));
    it('0  → COLD',     () => expect(getTier(0)).toBe('COLD'));
    it('100 → PRIORITY', () => expect(getTier(100)).toBe('PRIORITY'));
  });

  describe('calculateScoreDetailed — breakdown structure', () => {
    it('returns total, tier, and breakdown', () => {
      const result = calculateScoreDetailed({ timeline: '30_days' }, 0);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('breakdown');
    });

    it('breakdown fields sum to total', () => {
      const result = calculateScoreDetailed({
        timeline: '90_days',
        financing: 'needs_financing',
        budget: '350k',
        urgency: 'near_term',
      }, 5);
      const { breakdown } = result;
      const sum = breakdown.timeline + breakdown.financing + breakdown.budget + breakdown.urgency + breakdown.engagement;
      expect(sum).toBe(result.total);
    });

    it('empty lead: all zeros, COLD tier', () => {
      const result = calculateScoreDetailed({}, 0);
      expect(result.total).toBe(0);
      expect(result.tier).toBe('COLD');
      expect(result.breakdown.timeline).toBe(0);
      expect(result.breakdown.financing).toBe(0);
      expect(result.breakdown.budget).toBe(0);
      expect(result.breakdown.urgency).toBe(0);
      expect(result.breakdown.engagement).toBe(0);
    });
  });
});
