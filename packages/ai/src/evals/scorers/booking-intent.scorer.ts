export interface ConversationMessageForScoring {
  role: 'AI' | 'HUMAN' | 'SYSTEM';
  content: string;
}

const BOOKING_TERMS = [
  'see', 'visit', 'tour', 'appointment', 'schedule', 'meet', 'show me',
  'when can', 'available', 'tomorrow', 'this week', 'next week', 'can we',
  'showing', 'open house', 'viewing', 'walk through', 'walkthrough',
];

const TIME_TERMS = [
  'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday', 'this week', 'next week', 'afternoon', 'morning', 'evening',
];

const PROPERTY_TERMS = [
  'house', 'home', 'property', 'condo', 'apartment', 'listing', 'place',
];

/**
 * Scores booking intent from a conversation — deterministic, no LLM needed.
 * Checks last 3 human messages, weighted by recency (3x/2x/1x).
 * @returns 0.0-1.0 booking intent score
 */
export function scoreBookingIntent(
  messages: ConversationMessageForScoring[],
): number {
  const humanMessages = messages
    .filter(m => m.role === 'HUMAN')
    .map(m => m.content.toLowerCase());

  if (humanMessages.length === 0) return 0;

  const last3 = humanMessages.slice(-3).reverse(); // most recent first
  const weights = [3, 2, 1];

  let weightedScore = 0;
  let totalWeight = 0;

  last3.forEach((msg, idx) => {
    const w = weights[idx] ?? 1;
    totalWeight += w;

    let msgScore = 0;

    const hasBookingTerm = BOOKING_TERMS.some(term => msg.includes(term));
    const hasTimeTerm = TIME_TERMS.some(term => msg.includes(term));
    const hasPropertyTerm = PROPERTY_TERMS.some(term => msg.includes(term));

    if (hasBookingTerm) msgScore += 0.5;
    if (hasTimeTerm && hasPropertyTerm) msgScore += 0.35;
    if (hasBookingTerm && hasTimeTerm) msgScore += 0.15;

    weightedScore += Math.min(1, msgScore) * w;
  });

  return totalWeight > 0 ? Math.min(1, weightedScore / totalWeight) : 0;
}
