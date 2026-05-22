#!/usr/bin/env node
/**
 * ConversionOps — Production Environment Validator
 * Run before deploying: node infra/scripts/validate-env.mjs
 * Exit 0 = all checks pass, Exit 1 = failures found
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env file if provided
const envFile = process.argv[2] ?? '.env.production';
try {
  const content = readFileSync(resolve(process.cwd(), envFile), 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // Fall through — check current process.env
}

const errors = [];
const warnings = [];

function check(name, validator, errorMsg) {
  const val = process.env[name];
  if (!val || val.includes('REPLACE_') || val.includes('your_') || val.includes('PROJECT_ID')) {
    errors.push(`MISSING/PLACEHOLDER: ${name} — ${errorMsg}`);
    return;
  }
  if (validator && !validator(val)) {
    errors.push(`INVALID: ${name} — ${errorMsg}`);
  }
}

function warn(name, validator, warnMsg) {
  const val = process.env[name];
  if (!val) {
    warnings.push(`MISSING (optional): ${name} — ${warnMsg}`);
    return;
  }
  if (validator && !validator(val)) {
    warnings.push(`SUSPICIOUS: ${name} — ${warnMsg}`);
  }
}

// ─── CRITICAL — app will not start without these ─────────────────────────────
check('DATABASE_URL', (v) => v.startsWith('postgresql://'), 'Must be a PostgreSQL connection string');
check('REDIS_URL', (v) => v.startsWith('redis://'), 'Must be a Redis connection string');
check('JWT_SECRET', (v) => v.length >= 64, 'Must be at least 64 characters (currently: ' + (process.env.JWT_SECRET?.length ?? 0) + ')');
check('MAGIC_LINK_SECRET', (v) => v.length >= 64, 'Must be at least 64 characters');

// ─── REQUIRED FOR FULL FUNCTIONALITY ─────────────────────────────────────────
check('TWILIO_ACCOUNT_SID', (v) => v.startsWith('AC'), 'Must start with AC');
check('TWILIO_AUTH_TOKEN', (v) => v.length >= 32, 'Must be at least 32 characters');
check('TWILIO_PHONE_NUMBER', (v) => v.startsWith('+'), 'Must be E.164 format (+1...)');
check('STRIPE_SECRET_KEY', (v) => v.startsWith('sk_live_') || v.startsWith('sk_test_'), 'Must be a Stripe secret key');
check('STRIPE_WEBHOOK_SECRET', (v) => v.startsWith('whsec_'), 'Must start with whsec_');
check('RESEND_API_KEY', (v) => v.startsWith('re_'), 'Must start with re_');
check('GOOGLE_CLOUD_PROJECT', (v) => v.length > 0, 'Required for Vertex AI');
check('ADMIN_API_KEY', (v) => v.length >= 32, 'Must be at least 32 characters');

// ─── SECURITY CHECKS ──────────────────────────────────────────────────────────
if (process.env.JWT_SECRET === process.env.MAGIC_LINK_SECRET) {
  errors.push('SECURITY: JWT_SECRET and MAGIC_LINK_SECRET must be different values');
}
if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && process.env.NODE_ENV === 'production') {
  errors.push('SECURITY: Using Stripe TEST key in production environment');
}
if (process.env.NODE_ENV !== 'production') {
  warnings.push('NODE_ENV is not "production" — startup validation will be skipped in API');
}

// ─── OPTIONAL BUT RECOMMENDED ─────────────────────────────────────────────────
warn('SENTRY_DSN', (v) => v.includes('sentry.io'), 'Sentry not configured — error tracking disabled');
warn('ENABLE_TRACING', null, 'OpenTelemetry tracing not enabled');
warn('CORS_ORIGIN', null, 'CORS origins not set — will use defaults');
warn('CALCOM_API_KEY', null, 'Cal.com booking integration disabled');
warn('FOLLOW_UP_BOSS_API_KEY', null, 'Follow Up Boss CRM sync disabled');

// ─── REPORT ───────────────────────────────────────────────────────────────────
console.log('\nConversionOps Environment Validation\n' + '='.repeat(50));

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (' + warnings.length + '):');
  warnings.forEach(w => console.log('  ' + w));
}

if (errors.length > 0) {
  console.log('\n❌ ERRORS (' + errors.length + '):');
  errors.forEach(e => console.log('  ' + e));
  console.log('\nFix all errors before deploying to production.\n');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are valid.\n');
  process.exit(0);
}
