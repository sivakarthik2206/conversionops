import type { Lead, Workspace } from '@conversionops/db';

/**
 * Builds the first-contact AI message prompt, personalised by lead source.
 * Produces a warm opening that acknowledges how the lead reached out.
 */
export function buildResponsePrompt(lead: Lead, workspace: Workspace): string {
  const aiConfig = workspace.aiConfig as Record<string, unknown>;
  const agentName = typeof aiConfig['agentName'] === 'string' ? aiConfig['agentName'] : 'Alex';
  const sourcePayload = lead.sourcePayload as Record<string, unknown>;

  const contactName = lead.name ?? lead.fullName ?? null;
  const greeting = contactName ? `Hi ${contactName.split(' ')[0]}!` : 'Hi there!';

  let openingContext = '';
  let openingQuestion = '';

  switch (lead.source) {
    case 'ZILLOW': {
      const propertyAddress =
        typeof sourcePayload['propertyAddress'] === 'string'
          ? sourcePayload['propertyAddress']
          : null;
      openingContext = propertyAddress
        ? `I saw your inquiry about ${propertyAddress} on Zillow.`
        : `I saw your inquiry on Zillow.`;
      openingQuestion = `Are you still interested in that property, or are there other options you'd like to explore?`;
      break;
    }
    case 'MISSED_CALL': {
      openingContext = `I noticed you called our office but we missed your call — I wanted to reach out right away.`;
      openingQuestion = `Are you looking to buy or sell a property?`;
      break;
    }
    case 'SMS_INBOUND': {
      openingContext = `Thanks for reaching out!`;
      openingQuestion = `Are you looking to buy, sell, or get more information about a property?`;
      break;
    }
    case 'WEB_FORM': {
      openingContext = `I received your inquiry from our website.`;
      openingQuestion = `What can I help you with today — are you looking to buy or sell?`;
      break;
    }
    case 'REALTOR_COM': {
      openingContext = `I saw your inquiry on Realtor.com.`;
      openingQuestion = `Are you still looking for properties in the area?`;
      break;
    }
    case 'REFERRAL': {
      openingContext = `I heard you were referred to us — great to connect!`;
      openingQuestion = `Are you looking to buy or sell a property?`;
      break;
    }
    default: {
      openingContext = `Thanks for reaching out to ${workspace.name}!`;
      openingQuestion = `Are you looking to buy, sell, or learn more about our services?`;
      break;
    }
  }

  return `Generate a first-contact SMS message using these details:

Greeting: ${greeting}
Context: ${openingContext}
Question to ask: ${openingQuestion}
Sign off as: ${agentName} | ${workspace.name}

Requirements:
- Keep it to 2-3 sentences maximum
- Warm, professional, and conversational tone
- Include the greeting at the start
- End with the one question only — do not ask multiple questions
- Sign off at the end
- Do NOT mention you are an AI`;
}
