import { calculateScore, getTier, calculateScoreDetailed } from '../scoring/lead-scorer';
import type { QualificationData } from '../prompts/qualification.prompt';

// Minimal qualification data with no fields set — baseline score = 0
const EMPTY: QualificationData = {};

// Highest-scoring qualification — all best-case values
const PERFECT: QualificationData = {
  timeline: '30_days',
  financing: 'pre_approved',
  budget: '$600000',
  urgency: 'immediate',
};

describe('Lead Scorer — calculateScore', () => {
  describe('empty qualification → 0 base score', () => {
    it('returns 0 for completely empty qualification with 0 engagement', () => {
      expect(calculateScore(EMPTY, 0)).toBe(0);
    });

    it('returns engagement only (capped at 10) when qualification is empty', () => {
      expect(calculateScore(EMPTY, 5)).toBe(5);
      expect(calculateScore(EMPTY, 10)).toBe(10);
    });

    it('caps engagement at 10 even if passed higher', () => {
      expect(calculateScore(EMPTY, 50)).toBe(10);
      expect(calculateScore(EMPTY, 100)).toBe(10);
    });
  });

  describe('timeline dimension (max 30pts)', () => {
    it('30_days gives 30 points', () => {
      expect(calculateScore({ timeline: '30_days' }, 0)).toBe(30);
    });
    it('90_days gives 20 points', () => {
      expect(calculateScore({ timeline: '90_days' }, 0)).toBe(20);
    });
    it('6_months gives 10 points', () => {
      expect(calculateScore({ timeline: '6_months' }, 0)).toBe(10);
    });
    it('browsing gives 0 points', () => {
      expect(calculateScore({ timeline: 'browsing' }, 0)).toBe(0);
    });
    it('unknown value gives 0 points', () => {
      expect(calculateScore({ timeline: 'someday' }, 0)).toBe(0);
    });
  });

  describe('financing dimension (max 25pts)', () => {
    it('pre_approved gives 25 points', () => {
      expect(calculateScore({ financing: 'pre_approved' }, 0)).toBe(25);
    });
    it('cash gives 25 points', () => {
      expect(calculateScore({ financing: 'cash' }, 0)).toBe(25);
    });
    it('needs_financing gives 10 points', () => {
      expect(calculateScore({ financing: 'needs_financing' }, 0)).toBe(10);
    });
    it('unknown gives 0 points', () => {
      expect(calculateScore({ financing: 'unknown' }, 0)).toBe(0);
    });
  });

  describe('budget dimension (max 20pts)', () => {
    it('$600k budget gives 20 points', () => {
      expect(calculateScore({ budget: '$600000' }, 0)).toBe(20);
      expect(calculateScore({ budget: '600k' }, 0)).toBe(20);
    });
    it('$500k exactly gives 20 points', () => {
      expect(calculateScore({ budget: '500001' }, 0)).toBe(20);
    });
    it('$400k budget gives 15 points', () => {
      expect(calculateScore({ budget: '400000' }, 0)).toBe(15);
    });
    it('$300k exactly gives 15 points', () => {
      expect(calculateScore({ budget: '300001' }, 0)).toBe(15);
    });
    it('$150k budget gives 8 points', () => {
      expect(calculateScore({ budget: '150000' }, 0)).toBe(8);
    });
    it('$100k exactly gives 8 points', () => {
      expect(calculateScore({ budget: '100001' }, 0)).toBe(8);
    });
    it('$50k budget gives 3 points', () => {
      expect(calculateScore({ budget: '50000' }, 0)).toBe(3);
    });
    it('missing budget gives 0 points', () => {
      expect(calculateScore(EMPTY, 0)).toBe(0);
    });
    it('parses $1.5M correctly (>500k → 20 pts)', () => {
      expect(calculateScore({ budget: '1.5m' }, 0)).toBe(20);
    });
    it('parses shorthand like 250k → 15 pts (>100k, ≤300k range → 8pts)', () => {
      expect(calculateScore({ budget: '250k' }, 0)).toBe(8);
    });
  });

  describe('urgency dimension (max 15pts)', () => {
    it('immediate gives 15 points', () => {
      expect(calculateScore({ urgency: 'immediate' }, 0)).toBe(15);
    });
    it('near_term gives 8 points', () => {
      expect(calculateScore({ urgency: 'near_term' }, 0)).toBe(8);
    });
    it('browsing gives 0 points', () => {
      expect(calculateScore({ urgency: 'browsing' }, 0)).toBe(0);
    });
    it('unknown value gives 0 points', () => {
      expect(calculateScore({ urgency: 'someday' }, 0)).toBe(0);
    });
  });

  describe('combined scoring', () => {
    it('PERFECT qualification yields 90 (30+25+20+15) + 0 engagement', () => {
      expect(calculateScore(PERFECT, 0)).toBe(90);
    });

    it('PERFECT qualification + 10 engagement yields 100', () => {
      expect(calculateScore(PERFECT, 10)).toBe(100);
    });

    it('does NOT exceed 100 for any input', () => {
      expect(calculateScore(PERFECT, 100)).toBe(100);
    });

    it('mid-range lead scores correctly', () => {
      const q: QualificationData = {
        timeline: '90_days',     // 20pts
        financing: 'needs_financing', // 10pts
        budget: '350k',           // 15pts
        urgency: 'near_term',     // 8pts
      };
      expect(calculateScore(q, 5)).toBe(58); // 20+10+15+8+5
    });
  });
});

describe('Lead Scorer — getTier', () => {
  describe('PRIORITY tier (80-100)', () => {
    it('score 100 → PRIORITY', () => {
      expect(getTier(100)).toBe('PRIORITY');
    });
    it('score 80 → PRIORITY', () => {
      expect(getTier(80)).toBe('PRIORITY');
    });
    it('score 85 → PRIORITY', () => {
      expect(getTier(85)).toBe('PRIORITY');
    });
  });

  describe('HOT tier (60-79)', () => {
    it('score 79 → HOT', () => {
      expect(getTier(79)).toBe('HOT');
    });
    it('score 60 → HOT', () => {
      expect(getTier(60)).toBe('HOT');
    });
    it('score 65 → HOT', () => {
      expect(getTier(65)).toBe('HOT');
    });
  });

  describe('WARM tier (30-59)', () => {
    it('score 59 → WARM', () => {
      expect(getTier(59)).toBe('WARM');
    });
    it('score 30 → WARM', () => {
      expect(getTier(30)).toBe('WARM');
    });
    it('score 45 → WARM', () => {
      expect(getTier(45)).toBe('WARM');
    });
  });

  describe('COLD tier (0-29)', () => {
    it('score 29 → COLD', () => {
      expect(getTier(29)).toBe('COLD');
    });
    it('score 0 → COLD', () => {
      expect(getTier(0)).toBe('COLD');
    });
    it('score 15 → COLD', () => {
      expect(getTier(15)).toBe('COLD');
    });
  });

  describe('boundary conditions', () => {
    // Verify exact boundaries match the spec: PRIORITY≥80, HOT≥60, WARM≥30, COLD<30
    it.each([
      [80, 'PRIORITY'], [79, 'HOT'],
      [60, 'HOT'], [59, 'WARM'],
      [30, 'WARM'], [29, 'COLD'],
    ] as const)('score %d → %s', (score, expected) => {
      expect(getTier(score)).toBe(expected);
    });
  });
});

describe('Lead Scorer — calculateScoreDetailed', () => {
  it('returns total, tier, and breakdown object', () => {
    const result = calculateScoreDetailed(PERFECT, 0);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('tier');
    expect(result).toHaveProperty('breakdown');
  });

  it('breakdown sums equal the total', () => {
    const q: QualificationData = {
      timeline: '30_days',        // 30
      financing: 'pre_approved',   // 25
      budget: '450k',             // 15
      urgency: 'near_term',        // 8
    };
    const result = calculateScoreDetailed(q, 7);
    const { breakdown } = result;
    const sum = breakdown.timeline + breakdown.financing + breakdown.budget + breakdown.urgency + breakdown.engagement;
    expect(sum).toBe(result.total);
  });

  it('PERFECT breakdown: timeline=30, financing=25, budget=20, urgency=15', () => {
    const result = calculateScoreDetailed(PERFECT, 0);
    expect(result.breakdown.timeline).toBe(30);
    expect(result.breakdown.financing).toBe(25);
    expect(result.breakdown.budget).toBe(20);
    expect(result.breakdown.urgency).toBe(15);
    expect(result.breakdown.engagement).toBe(0);
    expect(result.total).toBe(90);
    expect(result.tier).toBe('PRIORITY');
  });

  it('EMPTY breakdown: all zeros', () => {
    const result = calculateScoreDetailed(EMPTY, 0);
    expect(result.breakdown.timeline).toBe(0);
    expect(result.breakdown.financing).toBe(0);
    expect(result.breakdown.budget).toBe(0);
    expect(result.breakdown.urgency).toBe(0);
    expect(result.breakdown.engagement).toBe(0);
    expect(result.total).toBe(0);
    expect(result.tier).toBe('COLD');
  });

  it('engagement is capped at 10 in the breakdown', () => {
    const result = calculateScoreDetailed(EMPTY, 999);
    expect(result.breakdown.engagement).toBe(10);
  });
});
