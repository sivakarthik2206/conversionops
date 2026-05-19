export interface ConversationMessage {
  role: 'AI' | 'HUMAN' | 'SYSTEM';
  content: string;
  createdAt: Date;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  summary: string | null;
  leadName?: string | null;
}

export interface QualificationData {
  budget?: string;
  timeline?: string;
  financing?: string;
  area?: string;
  propertyType?: string;
  urgency?: string;
  intent?: string;
}

const QUALIFICATION_FIELDS = [
  'intent',
  'area',
  'propertyType',
  'budget',
  'timeline',
  'financing',
  'urgency',
] as const;

type QualificationField = (typeof QUALIFICATION_FIELDS)[number];

const FIELD_QUESTIONS: Record<QualificationField, string> = {
  intent: 'Are you looking to buy, sell, or both?',
  area: 'What area or neighborhoods are you focused on?',
  propertyType: 'What type of property are you looking for — single-family home, condo, townhouse?',
  budget: "What's your approximate budget range?",
  timeline: 'When are you hoping to make a move — are you targeting a specific timeframe?',
  financing: 'Have you already spoken with a lender, or are you still exploring financing options?',
  urgency: "On a scale of urgency — are you ready to move quickly, or are you still in the early stages of planning?",
};

/**
 * Builds the qualification prompt for ongoing conversations.
 * Identifies the next unanswered qualification field and instructs the AI
 * to ask exactly one question naturally in context.
 */
export function buildQualificationPrompt(
  context: ConversationContext,
  qualification: QualificationData,
): string {
  const historyText = buildHistoryText(context);
  const unanswered = QUALIFICATION_FIELDS.filter((field) => !qualification[field]);

  if (unanswered.length === 0) {
    return `${historyText}

All qualification questions have been answered. Summarise what you know about this lead's goals in a warm, personalised way, then transition naturally to booking an appointment. Invite them to schedule a brief call or meeting to discuss their goals further.`;
  }

  const bookingSignals = context.messages.slice(-6).some((m) => {
    const text = m.content.toLowerCase();
    return (
      text.includes('schedule') ||
      text.includes('appointment') ||
      text.includes('meet') ||
      text.includes('call') ||
      text.includes('available') ||
      text.includes('when can we')
    );
  });

  if (bookingSignals) {
    return `${historyText}

The lead appears ready to book an appointment. Warmly confirm their interest and invite them to schedule a time that works for them. Ask for their preferred day/time or direct them to the booking calendar.`;
  }

  const nextField = unanswered[0] as QualificationField;
  const question = FIELD_QUESTIONS[nextField];
  const answeredCount = QUALIFICATION_FIELDS.length - unanswered.length;

  return `${historyText}

Continue qualifying this lead naturally. You have gathered ${answeredCount} of ${QUALIFICATION_FIELDS.length} key details so far.

Next field to gather: ${nextField}
Suggested question (adapt naturally): "${question}"

Respond to what the lead just said first, then ask this single question. Never ask more than one question at a time.`;
}

function buildHistoryText(context: ConversationContext): string {
  const parts: string[] = ['=== Conversation History ==='];

  if (context.summary) {
    parts.push(`[Summary of earlier conversation]: ${context.summary}`);
    parts.push('');
  }

  for (const msg of context.messages.slice(-12)) {
    const label = msg.role === 'AI' ? 'Agent' : msg.role === 'HUMAN' ? 'Lead' : 'System';
    parts.push(`${label}: ${msg.content}`);
  }

  parts.push('=== End of History ===');
  return parts.join('\n');
}
