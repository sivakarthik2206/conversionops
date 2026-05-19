export { VertexAIClient } from './client';
export type { GenerateOptions, GenerateResponse } from './client';

export { buildSystemPrompt } from './prompts/system.prompt';
export { buildQualificationPrompt } from './prompts/qualification.prompt';
export type { ConversationContext, ConversationMessage, QualificationData } from './prompts/qualification.prompt';
export { buildResponsePrompt } from './prompts/response.prompt';

export { runQualificationChain } from './chains/qualification.chain';
export type { QualificationResult } from './chains/qualification.chain';

export { calculateScore, getTier, updateLeadScore } from './scoring/lead-scorer';
export type { LeadScoreBreakdown } from './scoring/lead-scorer';

export { checkQuota, trackUsage, alertIfApproaching } from './governance/token-budget';
export type { QuotaCheckResult, AlertResult } from './governance/token-budget';

export { ConversationMemoryManager } from './memory/conversation-memory';
