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

export class VertexAIClient {
  private readonly model: GenerativeModel;
  private readonly modelId: string;

  constructor() {
    const project = process.env['GOOGLE_CLOUD_PROJECT'];
    const location = process.env['VERTEX_AI_LOCATION'] ?? 'us-central1';
    this.modelId = process.env['VERTEX_AI_MODEL'] ?? 'gemini-1.5-flash-001';

    if (!project) {
      throw new Error('GOOGLE_CLOUD_PROJECT env var is required');
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

  /**
   * Generates a response from Gemini. Wraps all errors — never throws.
   * Handles quota errors, safety filters, and timeout after 30s.
   * @returns Result<GenerateResponse>
   */
  async generate(
    systemPrompt: string,
    userPrompt: string,
    options: GenerateOptions = {},
  ): Promise<Result<GenerateResponse>> {
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
          return {
            ok: false,
            error: new ExternalServiceError('vertex-ai', 'CONTENT_FILTERED'),
          };
        }
        return {
          ok: false,
          error: new ExternalServiceError('vertex-ai', 'No candidates in response'),
        };
      }

      const content = candidate.content.parts
        .filter((p): p is { text: string } => 'text' in p && typeof p.text === 'string')
        .map((p) => p.text)
        .join('');

      const usage = response.usageMetadata;
      const latencyMs = Date.now() - startMs;

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
        return {
          ok: false,
          error: new ExternalServiceError('vertex-ai', 'Request timed out after 30s'),
        };
      }

      if (errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('quota')) {
        return {
          ok: false,
          error: new ExternalServiceError('vertex-ai', 'AI_QUOTA_EXCEEDED'),
        };
      }

      return {
        ok: false,
        error: new ExternalServiceError('vertex-ai', errMessage),
      };
    }
  }

  /**
   * Generates with retry — 3 attempts with exponential backoff (1s, 2s, 4s).
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
        !errMsg.includes('CONTENT_FILTERED') && !errMsg.includes('AI_QUOTA_EXCEEDED');

      if (!isRetryable || attempt === 2) break;

      await new Promise((r) => setTimeout(r, delays[attempt]));
    }

    return lastResult ?? { ok: false, error: new ExternalServiceError('vertex-ai', 'All retries failed') };
  }

  getModelId(): string {
    return this.modelId;
  }
}
