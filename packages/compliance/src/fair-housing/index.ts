/ Fair Housing Act compliance filter
// Any AI message mentioning property characteristics must pass this check.

const PROHIBITED_PATTERNS = [
  /school district/i,
  /good neighborhood/i,
  /bad neighborhood/i,
  /family.friendly/i,
  /quiet area/i,
  /safe area/i,
  /diverse/i,
] as const;

export interface FairHousingCheckResult {
  passed: boolean;
  flaggedPatterns: string[];
}

export function checkFairHousing(content: string): FairHousingCheckResult {
  const flaggedPatterns: string[] = [];
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(content)) {
      flaggedPatterns.push(pattern.source);
    }
  }
  return { passed: flaggedPatterns.length === 0, flaggedPatterns };
}
