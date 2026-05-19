import type { QualificationData } from '../../prompts/qualification.prompt';

const QUALIFICATION_FIELDS = [
  'budget', 'timeline', 'financing', 'area', 'propertyType', 'urgency', 'intent',
] as const;

/**
 * Scores qualification completeness as a 0.0-1.0 ratio of filled fields.
 */
export function scoreQualificationProgress(qualification: QualificationData): number {
  const filled = QUALIFICATION_FIELDS.filter(f => !!qualification[f]).length;
  return filled / QUALIFICATION_FIELDS.length;
}

/**
 * Returns the name of the first unanswered qualification field, or null if all answered.
 */
export function getNextUnansweredField(qualification: QualificationData): string | null {
  for (const field of QUALIFICATION_FIELDS) {
    if (!qualification[field]) return field;
  }
  return null;
}
