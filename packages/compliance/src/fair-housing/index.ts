export interface FairHousingCheckResult {
  passed: boolean;
  flaggedPatterns: string[];
}

const PROHIBITED_PATTERNS = [
  /school district/i,
  /good neighborhood/i,
  /bad neighborhood/i,
  /family.friendly/i,
  /safe area/i,
  /diverse/i,
];

export function checkFairHousing(content: string): FairHousingCheckResult {
  const flaggedPatterns: string[] = [];
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(content)) {
      flaggedPatterns.push(pattern.source);
    }
  }
  return { passed: flaggedPatterns.length === 0, flaggedPatterns };
}
