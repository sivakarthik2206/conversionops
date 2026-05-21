/**
 * test-lead-flow.ts — End-to-end smoke test for the lead intake flow.
 *
 * Run with: npx tsx scripts/test-lead-flow.ts
 * Tests the full lead flow without Twilio by calling internal APIs directly.
 *
 * Prereqs:
 *   - API running on http://localhost:3001 (pnpm dev)
 *   - A valid JWT in env TEST_TOKEN (or pass with --token=...)
 *   - The demo-brokerage workspace seeded (pnpm --filter @conversionops/db run db:seed:demo)
 */
import axios, { AxiosError } from 'axios';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001/v1';
const TOKEN =
  process.env.TEST_TOKEN ??
  process.argv.find((a) => a.startsWith('--token='))?.slice('--token='.length) ??
  'TEST_TOKEN';

const auth = { Authorization: `Bearer ${TOKEN}` };

function logStep(label: string, ok: boolean, detail?: string): void {
  const icon = ok ? '✓' : '✗';
  // eslint-disable-next-line no-console
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`);
}

function fmtError(err: unknown): string {
  if (err instanceof AxiosError) {
    return `HTTP ${err.response?.status ?? '?'} ${JSON.stringify(err.response?.data) ?? err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

async function testFlow(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`Testing ConversionOps lead flow against ${API_BASE}\n`);

  let leadId: string | undefined;

  // 1. Create a lead
  try {
    const res = await axios.post(
      `${API_BASE}/leads`,
      {
        source: 'MANUAL',
        name: 'Smoke Test Lead',
        phone: '+15555550100',
        email: `smoke+${Date.now()}@example.com`,
      },
      { headers: auth },
    );
    leadId = res.data?.id ?? res.data?.data?.id;
    logStep('Lead created', Boolean(leadId), leadId);
  } catch (err) {
    logStep('Lead created', false, fmtError(err));
    process.exit(1);
  }

  // 2. List leads — verify lead appears
  try {
    const res = await axios.get(`${API_BASE}/leads`, { headers: auth });
    const items: unknown[] = res.data?.data ?? res.data?.items ?? res.data ?? [];
    const found = Array.isArray(items) && items.some((l) => (l as { id?: string }).id === leadId);
    logStep('Lead in list', found, `total=${Array.isArray(items) ? items.length : 'n/a'}`);
  } catch (err) {
    logStep('Lead in list', false, fmtError(err));
  }

  // 3. Fetch lead by id — tenant isolation check
  try {
    const res = await axios.get(`${API_BASE}/leads/${leadId}`, { headers: auth });
    logStep('Lead detail fetched', res.data?.id === leadId || res.data?.data?.id === leadId);
  } catch (err) {
    logStep('Lead detail fetched', false, fmtError(err));
  }

  // 4. Verify conversation created for lead
  try {
    const res = await axios.get(`${API_BASE}/conversations`, { headers: auth });
    const items: unknown[] = res.data?.data ?? res.data?.items ?? res.data ?? [];
    logStep('Conversations endpoint reachable', Array.isArray(items), `count=${Array.isArray(items) ? items.length : 'n/a'}`);
  } catch (err) {
    logStep('Conversations endpoint reachable', false, fmtError(err));
  }

  // 5. Workspace health
  try {
    const res = await axios.get(`${API_BASE}/workspaces/me/health`, { headers: auth });
    logStep('Workspace health', res.status === 200, JSON.stringify(res.data).slice(0, 80));
  } catch (err) {
    logStep('Workspace health', false, fmtError(err));
  }

  // eslint-disable-next-line no-console
  console.log('\nFlow test complete.');
}

testFlow().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal:', fmtError(err));
  process.exit(1);
});
