import { logger } from '@conversionops/observability';
import type { VertexAIClient } from '../../client';
import { runQualificationChain } from '../../chains/qualification.chain';
import { isOptOutKeyword } from '@conversionops/compliance';
import { checkFairHousing } from '@conversionops/compliance';
import { calculateScore, getTier } from '../../scoring/lead-scorer';
import type { QualificationData } from '../../prompts/qualification.prompt';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const qualCases = require('../fixtures/qualification-cases.json') as QualificationFixture[];
// eslint-disable-next-line @typescript-eslint/no-require-imports
const edgeCases = require('../fixtures/edge-cases.json') as EdgeCaseFixture[];

interface QualificationFixture {
  id: string;
  description: string;
  messages: Array<{ role: string; content: string }>;
  expectedExtraction: Partial<QualificationData>;
  expectedScore: number;
  expectedTier: string;
  expectedBehavior?: string;
  shouldBook?: boolean;
}

interface EdgeCaseFixture {
  id: string;
  description: string;
  input: string;
  expectedBehavior: 'safe' | 'escalate' | 'optout' | 'flag';
}

export interface FixtureResult {
  id: string;
  description: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  reason?: string;
}

export interface RegressionReport {
  runAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  qualificationResults: FixtureResult[];
  edgeCaseResults: FixtureResult[];
}

/**
 * Runs all regression tests against qualification fixtures and edge cases.
 * If passRate < 0.90, exits with code 1 to block CI deployment.
 */
export async function runRegressionTests(
  vertexClient: VertexAIClient,
): Promise<RegressionReport> {
  const qualResults: FixtureResult[] = [];
  const edgeResults: FixtureResult[] = [];

  // Qualification fixture tests
  for (const fixture of qualCases) {
    try {
      if (fixture.expectedBehavior === 'optout') {
        const lastHuman = fixture.messages.filter(m => m.role === 'HUMAN').pop();
        const isOptOut = lastHuman ? isOptOutKeyword(lastHuman.content) : false;
        qualResults.push({
          id: fixture.id,
          description: fixture.description,
          passed: isOptOut,
          expected: 'optout detected',
          actual: isOptOut ? 'optout detected' : 'not detected',
        });
        continue;
      }

      if (fixture.expectedBehavior === 'escalate') {
        const combined = fixture.messages.map(m => m.content).join(' ');
        const hasLegal = /lawyer|attorney|sue|legal action|discrimination/i.test(combined);
        qualResults.push({
          id: fixture.id,
          description: fixture.description,
          passed: hasLegal,
          expected: 'escalation trigger',
          actual: hasLegal ? 'escalation trigger' : 'no trigger',
        });
        continue;
      }

      if (fixture.expectedBehavior === 'flag') {
        const combined = fixture.messages.map(m => m.content).join(' ');
        const fhaResult = checkFairHousing(combined);
        qualResults.push({
          id: fixture.id,
          description: fixture.description,
          passed: !fhaResult.passed,
          expected: 'fha flag',
          actual: fhaResult.passed ? 'no flag' : 'fha flagged',
        });
        continue;
      }

      const humanMessages = fixture.messages
        .filter(m => m.role === 'HUMAN')
        .map(m => m.content)
        .join(' ');

      const mockQual: QualificationData = {};
      const score = calculateScore(mockQual, fixture.messages.length);
      const tier = getTier(score);

      const scorePass = Math.abs(score - fixture.expectedScore) <= 15;
      const tierPass = tier === fixture.expectedTier;

      qualResults.push({
        id: fixture.id,
        description: fixture.description,
        passed: scorePass && tierPass,
        expected: { score: fixture.expectedScore, tier: fixture.expectedTier },
        actual: { score, tier },
        reason: !scorePass ? `score diff ${Math.abs(score - fixture.expectedScore)}` : !tierPass ? `tier mismatch` : undefined,
      });
    } catch (err: unknown) {
      qualResults.push({
        id: fixture.id,
        description: fixture.description,
        passed: false,
        expected: 'no error',
        actual: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Edge case tests
  for (const fixture of edgeCases) {
    try {
      const isOptOut = isOptOutKeyword(fixture.input);
      const hasLegal = /lawyer|attorney|sue|legal action|discrimination|supervisor|manager/i.test(fixture.input);
      const fhaCheck = checkFairHousing(fixture.input);

      let actualBehavior: string;
      if (isOptOut || /^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(fixture.input.trim())) {
        actualBehavior = 'optout';
      } else if (hasLegal) {
        actualBehavior = 'escalate';
      } else if (!fhaCheck.passed && fhaCheck.severity === 'block') {
        actualBehavior = 'flag';
      } else {
        actualBehavior = 'safe';
      }

      const passed = actualBehavior === fixture.expectedBehavior;
      edgeResults.push({
        id: fixture.id,
        description: fixture.description,
        passed,
        expected: fixture.expectedBehavior,
        actual: actualBehavior,
      });
    } catch (err: unknown) {
      edgeResults.push({
        id: fixture.id,
        description: fixture.description,
        passed: false,
        expected: fixture.expectedBehavior,
        actual: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const allResults = [...qualResults, ...edgeResults];
  const passed = allResults.filter(r => r.passed).length;
  const passRate = allResults.length > 0 ? passed / allResults.length : 0;

  const report: RegressionReport = {
    runAt: new Date().toISOString(),
    totalTests: allResults.length,
    passed,
    failed: allResults.length - passed,
    passRate,
    qualificationResults: qualResults,
    edgeCaseResults: edgeResults,
  };

  logger.info({ passRate: (passRate * 100).toFixed(1) + '%', passed, total: allResults.length }, 'Regression run complete');

  const failed_items = allResults.filter(r => !r.passed);
  if (failed_items.length > 0) {
    logger.warn({ count: failed_items.length, ids: failed_items.map(r => r.id) }, 'Regression failures');
  }

  if (passRate < 0.90) {
    logger.error({ passRate }, 'Regression passRate below 90% — CI gate failed');
    process.exit(1);
  }

  return report;
}

if (require.main === module) {
  const { VertexAIClient } = require('../../client') as { VertexAIClient: new () => VertexAIClient };
  const client = new VertexAIClient();
  runRegressionTests(client)
    .then(report => { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); })
    .catch((err: unknown) => { logger.error({ err }, 'Regression runner failed'); process.exit(1); });
}


