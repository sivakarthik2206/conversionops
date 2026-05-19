export interface FairHousingCheckResult {
  passed: boolean;
  flaggedPatterns: string[];
  severity: 'warn' | 'block';
}

interface PatternRule {
  pattern: RegExp;
  severity: 'warn' | 'block';
}

/**
 * Patterns that BLOCK — directly steer by protected class (race, religion, national origin,
 * sex, familial status, disability). These are FHA violations.
 */
const BLOCK_PATTERNS: PatternRule[] = [
  { pattern: /\b(racial|ethnicity|ethnic)\b.{0,30}(area|neighborhood|community|district)/i, severity: 'block' },
  { pattern: /\b(black|white|hispanic|asian|latino|jewish|muslim|christian)\b.{0,30}(neighborhood|area|community)/i, severity: 'block' },
  { pattern: /\b(good|bad|nice|rough|tough|dangerous|sketchy)\s+(neighborhood|area|community|part of town)/i, severity: 'block' },
  { pattern: /\b(safe|unsafe|dangerous)\s+(neighborhood|area|community|part of town)/i, severity: 'block' },
  { pattern: /\b(best|worst)\s+(neighborhood|area|part of town|community)/i, severity: 'block' },
  { pattern: /\b(not|no)\s+(many|much|a lot of|lots of)\s+(minorities|immigrants|foreigners)/i, severity: 'block' },
  { pattern: /\b(predominantly|mostly|mainly|heavily)\s+(white|black|hispanic|asian|jewish|christian|muslim)/i, severity: 'block' },
  { pattern: /you('ll)?\s+(love|enjoy|prefer|like)\s+(the\s+)?(neighbors|community|people in the area)/i, severity: 'block' },
  { pattern: /\b(crime|criminal)\s+(rate|activity|problem|issue)/i, severity: 'block' },
  { pattern: /\b(school district|school system)\b/i, severity: 'block' },
  { pattern: /\b(family.?friendly|great for families|perfect for families)\b/i, severity: 'block' },
  { pattern: /\b(up.?and.?coming|gentrifying|transitional)\s+(area|neighborhood|community)/i, severity: 'block' },
  { pattern: /\b(diverse|not\s+diverse|lacks diversity|homogeneous)\b/i, severity: 'block' },
  { pattern: /\bperfect for\s+(young|old|retired|senior|children|families|singles)\b/i, severity: 'block' },
  { pattern: /\b(quiet|noisy|loud)\s+(neighborhood|area|community|street)\b/i, severity: 'warn' },
];

/**
 * Patterns that WARN — borderline language that could imply protected class steering.
 */
const WARN_PATTERNS: PatternRule[] = [
  { pattern: /\b(established|older|traditional|historic)\s+(community|neighborhood|area)\b/i, severity: 'warn' },
  { pattern: /\b(young professional|starter home|retirement)\b/i, severity: 'warn' },
  { pattern: /\b(walking distance|close to|near)\s+(church|mosque|synagogue|temple|place of worship)\b/i, severity: 'warn' },
  { pattern: /\b(great|excellent|top|best|highly.?rated)\s+(school|schools)\b/i, severity: 'warn' },
  { pattern: /\b(well.?maintained|manicured|pride of ownership)\s+(neighborhood|area|homes|properties)\b/i, severity: 'warn' },
];

/**
 * Checks AI-generated content for Fair Housing Act compliance.
 * Returns passed=false with severity='block' for direct protected-class steering,
 * and severity='warn' for borderline language.
 */
export function checkFairHousing(content: string): FairHousingCheckResult {
  const flaggedPatterns: string[] = [];
  let highestSeverity: 'warn' | 'block' = 'warn';

  for (const rule of BLOCK_PATTERNS) {
    if (rule.pattern.test(content)) {
      flaggedPatterns.push(rule.pattern.source);
      if (rule.severity === 'block') highestSeverity = 'block';
    }
  }

  if (flaggedPatterns.length === 0) {
    for (const rule of WARN_PATTERNS) {
      if (rule.pattern.test(content)) {
        flaggedPatterns.push(rule.pattern.source);
      }
    }
  }

  const passed = flaggedPatterns.length === 0;
  return {
    passed,
    flaggedPatterns,
    severity: passed ? 'warn' : highestSeverity,
  };
}
