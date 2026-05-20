import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — ConversionOps',
  description: 'ConversionOps privacy policy and data practices.',
};

const SECTIONS = [
  {
    id: 'collect',
    title: 'Information We Collect',
    body: `We collect information you provide directly — including business name, email address, phone number, and payment details. We also collect lead data processed through our platform on your behalf, including names, phone numbers, and conversation transcripts. Usage data including API calls, AI token consumption, and platform activity is collected automatically.`,
  },
  {
    id: 'use',
    title: 'How We Use Your Information',
    body: `Your data is used exclusively to provide and improve the ConversionOps service. Lead data you process is treated as your data — we act as a data processor on your behalf. We do not sell, rent, or share your data or your leads' data with third parties for marketing purposes. AI conversation data is used to generate responses and may be used in aggregate, anonymized form to improve our models.`,
  },
  {
    id: 'tcpa',
    title: 'TCPA Compliance',
    body: `ConversionOps is built with TCPA compliance as a core invariant, not an option. All SMS communications require verified consent (OPTED_IN status in our ConsentRecord system). Opt-out keywords (STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT) are detected immediately and result in permanent cessation of AI outreach to that number. Quiet hours (9pm–8am local time) are enforced automatically. You as the operator remain responsible for ensuring your lead intake processes obtain proper consent.`,
  },
  {
    id: 'retention',
    title: 'Data Retention',
    body: `Lead data and conversation transcripts are retained for the duration of your subscription plus 90 days after cancellation. AuditLog records are retained for 7 years as required by applicable law. OperationalMetric data is retained for 90 days. You may request deletion of your workspace data at any time by contacting hello@conversionops.in.`,
  },
  {
    id: 'ccpa',
    title: 'CCPA Rights (California Residents)',
    body: `California residents have the right to know what personal information we collect, request deletion of their personal information, and opt out of the sale of personal information (we do not sell personal information). To exercise these rights, contact hello@conversionops.in with the subject line "CCPA Request".`,
  },
  {
    id: 'security',
    title: 'Data Security',
    body: `All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Our infrastructure runs exclusively on Google Cloud Platform in the US. We employ role-based access control, audit logging, and regular security reviews. Database credentials and API keys are stored in Google Secret Manager and rotated regularly.`,
  },
  {
    id: 'third-party',
    title: 'Third-Party Services',
    body: `We use the following third-party services: Google Cloud Platform (infrastructure and AI), Twilio (SMS/voice communications), Stripe (payment processing), Resend (transactional email), Cal.com (appointment booking), and Follow Up Boss (CRM sync). Each service processes data under their own privacy policies in addition to this one.`,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: `For privacy questions, data requests, or to report a concern: hello@conversionops.in. Response time: 2 business days.`,
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 32px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', marginBottom: 32 }}>
          ← Back
        </Link>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 12 }}>
          Legal
        </p>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 12px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Last updated: May 20, 2025</p>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {SECTIONS.map(section => (
          <div key={section.id} id={section.id}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
              {section.title}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.75, margin: 0 }}>
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
