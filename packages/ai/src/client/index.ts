import { GoogleGenAI } from '@google/genai';
import { ExternalServiceError } from '@conversionops/sdk-standards';
import type { Result } from '@conversionops/types';

export interface GenerateOptions {
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GenerateResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1024;
const GENERATE_TIMEOUT_MS = 30_000;

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60_000;

type CircuitState = 'closed' | 'open' | 'half-open';

// Minimal type shapes we care about from @google/genai response
interface GcpPart { text?: string }
interface GcpContent { parts?: GcpPart[] }
interface GcpCandidate { content?: GcpContent; finishReason?: string }
interface GcpUsage { promptTokenCount?: number; candidatesTokenCount?: number }
interface GcpResponse {
  candidates?: GcpCandidate[];
  usageMetadata?: GcpUsage;
  promptFeedback?: { blockReason?: string };
  text?: string;
}

export class VertexAIClient {
  private readonly ai: GoogleGenAI | null;
  private readonly modelId: string;

  private circuitState: CircuitState = 'closed';
  private circuitFailures = 0;
  private circuitOpenedAt: number | null = null;

  constructor() {
    const project = process.env['GOOGLE_CLOUD_PROJECT'];
    const location = process.env['GOOGLE_CLOUD_REGION'] ?? process.env['VERTEX_AI_LOCATION'] ?? 'us-central1';
    this.modelId = process.env['VERTEX_AI_MODEL'] ?? 'gemini-2.0-flash-001';

    if (!project) {
      this.ai = null;
      return;
    }

    this.ai = new GoogleGenAI({ project, location });
  }

  private checkCircuit(): Result<void> {
    if (this.circuitState === 'closed') return { ok: true, value: undefined };

    if (this.circuitState === 'open') {
      const elapsed = Date.now() - (this.circuitOpenedAt ?? 0);
      if (elapsed >= CIRCUIT_RESET_MS) {
        this.circuitState = 'half-open';
        return { ok: true, value: undefined };
      }
      return {
        ok: false,
        error: new ExternalServiceError('vertex-ai', 'CIRCUIT_OPEN: Gemini temporarily unavailable'),
      };
    }

    return { ok: true, value: undefined };
  }

  private recordSuccess(): void {
    this.circuitFailures = 0;
    this.circuitState = 'closed';
    this.circuitOpenedAt = null;
  }

  private recordFailure(): void {
    this.circuitFailures += 1;
    if (this.circuitState === 'half-open' || this.circuitFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitState = 'open';
      this.circuitOpenedAt = Date.now();
    }
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    options: GenerateOptions = {},
  ): Promise<Result<GenerateResponse>> {
    if (!this.ai) {
      return { ok: false, error: new ExternalServiceError('vertex-ai', 'GOOGLE_CLOUD_PROJECT not configured') };
    }

    const circuitCheck = this.checkCircuit();
    if (!circuitCheck.ok) return circuitCheck;

    const startMs = Date.now();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GENERATE_TIMEOUT')), GENERATE_TIMEOUT_MS),
    );

    try {
      const rawResult = await Promise.race([
        this.ai.models.generateContent({
          model: this.modelId,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
            temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          },
        }),
        timeoutPromise,
      ]);

      const result = rawResult as GcpResponse;
      const candidate = result.candidates?.[0];

      if (!candidate) {
        if (result.promptFeedback?.blockReason) {
          return {
            ok: false,
            error: new ExternalServiceError('vertex-ai', 'CONTENT_FILTERED'),
          };
        }
        this.recordFailure();
        return {
          ok: false,
          error: new ExternalServiceError('vertex-ai', 'No candidates in response'),
        };
      }

      // @google/genai provides a convenience .text accessor on the response
      const content = typeof result.text === 'string'
        ? result.text
        : (candidate.content?.parts ?? [])
            .map((p) => p.text ?? '')
            .join('');

      if (!content.trim()) {
        this.recordFailure();
        return { ok: false, error: new ExternalServiceError('vertex-ai', 'Empty content in response') };
      }

      const usage = result.usageMetadata;
      const latencyMs = Date.now() - startMs;

      this.recordSuccess();
      return {
        ok: true,
        value: {
          content,
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
          latencyMs,
        },
      };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);

      if (errMessage === 'GENERATE_TIMEOUT') {
        this.recordFailure();
        return {
          ok: false,
          error: new ExternalServiceError('vertex-ai', 'Request timed out after 30s'),
        };
      }

      if (errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('quota')) {
        this.circuitFailures = CIRCUIT_FAILURE_THRESHOLD;
        this.recordFailure();
        return {
          ok: false,
          error: new ExternalServiceError('vertex-ai', 'AI_QUOTA_EXCEEDED'),
        };
      }

      this.recordFailure();
      return {
        ok: false,
        error: new ExternalServiceError('vertex-ai', errMessage),
      };
    }
  }

  async generateWithRetry(
    systemPrompt: string,
    userPrompt: string,
    options: GenerateOptions = {},
  ): Promise<Result<GenerateResponse>> {
    const delays = [1000, 2000, 4000];
    let lastResult: Result<GenerateResponse> | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      lastResult = await this.generate(systemPrompt, userPrompt, options);
      if (lastResult.ok) return lastResult;

      const errMsg = lastResult.error.message;
      const isRetryable =
        !errMsg.includes('CONTENT_FILTERED') &&
        !errMsg.includes('AI_QUOTA_EXCEEDED') &&
        !errMsg.includes('CIRCUIT_OPEN');

      if (!isRetryable || attempt === 2) break;

      await new Promise((r) => setTimeout(r, delays[attempt]));
    }

    return lastResult ?? { ok: false, error: new ExternalServiceError('vertex-ai', 'All retries failed') };
  }

  getModelId(): string {
    return this.modelId;
  }

  getCircuitState(): { state: CircuitState; failures: number } {
    return { state: this.circuitState, failures: this.circuitFailures };
  }
}
