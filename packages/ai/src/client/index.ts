import { VertexAI } from '@google-cloud/vertexai';
import type { GenerativeModel } from '@google-cloud/vertexai';
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

// Circuit breaker: open after 5 consecutive failures, reset after 60s
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60_000;

type CircuitState = 'closed' | 'open' | 'half-open';

export class VertexAIClient {
  private readonly model: GenerativeModel | null;
  private readonly modelId: string;

  private circuitState: CircuitState = 'closed';
  private circuitFailures = 0;
  private circuitOpenedAt: number | null = null;

  constructor() {
    const project = process.env['GOOGLE_CLOUD_PROJECT'];
    const location = process.env['VERTEX_AI_LOCATION'] ?? 'us-central1';
    this.modelId = process.env['VERTEX_AI_MODEL'] ?? 'gemini-1.5-flash-001';

    if (!project) {
      this.model = null;
      return;
    }

    const vertexAI = new VertexAI({ project, location });
    this.model = vertexAI.getGenerativeModel({
      model: this.modelId,
      generationConfig: {
        maxOutputTokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    });
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

    // half-open: allow one probe
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

  /**
   * Generates a response from Gemini. Wraps all errors — never throws.
   * Includes circuit breaker, content filtering, and 30s timeout.
   * @returns Result<GenerateResponse>
   */
  async generate(
    systemPrompt: string,
    userPrompt: string,
    options: GenerateOptions = {},
  ): Promise<Result<GenerateResponse>> {
    if (!this.model) {
      return { ok: false, error: new ExternalServiceError('vertex-ai', 'GOOGLE_CLOUD_PROJECT not configured') };
    }

    const circuitCheck = this.checkCircuit();
    if (!circuitCheck.ok) return circuitCheck;

    const startMs = Date.now();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GENERATE_TIMEOUT')), GENERATE_TIMEOUT_MS),
    );

    try {
      const result = await Promise.race([
        this.model.generateContent({
          systemInstruction: systemPrompt,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
            temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          },
        }),
        timeoutPromise,
      ]);

      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate) {
        if (response.promptFeedback?.blockReason) {
          // Content filtered — not a circuit-breaker failure
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

      const content = candidate.content.parts
        .filter((p): p is { text: string } => 'text' in p && typeof p.text === 'string')
        .map((p) => p.text)
        .join('');

      if (!content.trim()) {
        this.recordFailure();
        return { ok: false, error: new ExternalServiceError('vertex-ai', 'Empty content in response') };
      }

      const usage = response.usageMetadata;
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
        // Quota exhaustion — open circuit immediately
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

  /**
   * Generates with exponential backoff — 3 attempts (1s, 2s, 4s).
   * Skips retry for content filtering and quota exhaustion (non-retryable).
   * @returns Result<GenerateResponse>
   */
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

  /** Returns current circuit breaker state — for health endpoint / monitoring. */
  getCircuitState(): { state: CircuitState; failures: number } {
    return { state: this.circuitState, failures: this.circuitFailures };
  }
}
