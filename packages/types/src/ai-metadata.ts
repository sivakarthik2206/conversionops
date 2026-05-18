xport interface AIMessageMetadata {
  promptVersion: string;
  promptHash: string;
  modelVersion: string;
  chainVersion: string;
  policyVersion: string;
  guardrailVersion: string;
  workspaceAiConfigSnapshot: {
    agentName: string;
    tone: string;
    customInstructions?: string;
  };
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  temperature: number;
  evalScores?: {
    relevance?: number;
    hallucination?: number;
    bookingIntent?: number;
    qualificationProgress?: number;
    runAt?: string;
  };
  wasOverridden?: boolean;
  overriddenBy?: string;
  overriddenAt?: string;
  tcpaChecked: boolean;
  fairHousingChecked: boolean;
  quietHoursApplied: boolean;
}
