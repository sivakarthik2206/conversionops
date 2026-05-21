import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Icon } from '@/components/Icon';

export const metadata = {
  title: 'Privacy Policy — ConversionOps',
  description: 'ConversionOps privacy policy and data practices.',
};

const SECTIONS = [
  {
    id: 'collect',
    title: 'Information we collect',
    body: `We collect information you provide directly — including business name, email address, phone number, and payment details. We also collect lead data processed through our platform on your behalf, including names, phone numbers, and conversation transcripts. Usage data including API calls, AI token consumption, and platform activity is collected automatically.`,
  },
  {
    id: 'use',
    title: 'How we use your information',
    body: `Your data is used exclusively to provide and improve the ConversionOps service. Lead data you process is treated as your data — we act as a data processor on your behalf. We do not sell, rent, or share your data or your leads' data with third parties for marketing purposes. AI conversation data is used to generate responses and may be used in aggregate, anonymized form to improve our models.`,
  },
  {
    id: 'tcpa',
    title: 'TCPA compliance',
    body: `ConversionOps is built with TCPA compliance as a core invariant, not an option. All SMS communications require verified consent (OPTED_IN status in our ConsentRecord system). Opt-out keywords (STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT) are detected immediately and result in permanent cessation of AI outreach to that number. Quiet hours (9pm–8am local time) are enforced automatically. You as the operator remain responsible for ensuring your lead intake processes obtain proper consent.`,
  },
  {
    id: 'retention',
    title: 'Data retention',
    body: `Lead data and conversation transcripts are retained for the duration of your subscription plus 90 days after cancellation. AuditLog records are retained for 7 years as required by applicable law. OperationalMetric data is retained for 90 days. You may request deletion of your workspace data at any time by contacting hello@conversionops.in.`,
  },
  {
    id: 'ccpa',
    title: 'CCPA rights (California residents)',
    body: `California residents have the right to know what personal information we collect, request deletion of their personal information, and opt out of the sale of personal information (we do not sell personal information). To exercise these rights, contact hello@conversionops.in with the subject line "CCPA Request".`,
  },
  {
    id: 'security',
    title: 'Data security',
    body: `All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Our infrastructure runs exclusively on Google Cloud Platform in the US. We employ role-based access control, audit logging, and regular security reviews. Database credentials and API keys are stored in Google Secret Manager and rotated regularly.`,
  },
  {
    id: 'third-party',
    title: 'Third-party services',
    body: `We use the following third-party services: Google Cloud Platform (infrastructure and AI), Twilio (SMS/voice communications), Stripe (payment processing), Resend (transactional email), Cal.com (appointment booking), and Follow Up Boss (CRM sync). Each service processes data under their own privacy policies in addition to this one.`,
  },
  {
    id: 'fair-housing',
    title: 'Fair Housing',
    body: `ConversionOps systems are designed to comply with the Fair Housing Act. The AI is explicitly instructed never to discuss or solicit information about race, color, religion, national origin, sex, familial status, or disability. All outbound messages pass through a Fair Housing pre-send checklist before being delivered.`,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: `For privacy questions, data requests, or to report a concern: hello@conversionops.in. Response time: 2 business days.`,
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <LegalShell
        eyebrow="Legal · Privacy"
        title="Privacy Policy"
        updated="May 20, 2026"
        sections={SECTIONS}
      />
      <Footer />
    </main>
  );
}

export function LegalShell({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: { id: string; title: string; body: string }[];
}) {
  return (
    <>
      {/* Header */}
      <section
        style={{
          paddingTop: 'clamp(140px, 18vw, 200px)',
          paddingBottom: 48,
          borderBottom: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(ellipse, rgba(232,255,71,0.04) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div className="container-page" style={{ maxWidth: 880, position: 'relative' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text-3)',
              textDecoration: 'none',
              marginBottom: 32,
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'color 0.2s',
            }}
          >
            <Icon name="arrow-right" size={12} stroke={2} style={{ transform: 'rotate(180deg)' }} />
            Back home
          </Link>

          <span className="eyebrow" style={{ color: 'var(--accent)' }}>{eyebrow}</span>
          <h1
            className="serif"
            style={{
              fontSize: 'clamp(40px, 6vw, 64px)',
              lineHeight: 1.0,
              color: 'var(--text)',
              margin: '14px 0 14px',
              fontWeight: 400,
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
            Last updated · {updated}
          </p>
        </div>
      </section>

      {/* TOC + body */}
      <section style={{ padding: '64px 0 96px' }}>
        <div className="container-page legal-grid" style={{ maxWidth: 1080, display: 'grid', gridTemplateColumns: '240px 1fr', gap: 64 }}>
          {/* TOC */}
          <aside
            className="legal-toc"
            style={{
              position: 'sticky',
              top: 100,
              alignSelf: 'flex-start',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              paddingBottom: 16,
            }}
          >
            <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              Contents
            </div>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontSize: 13,
                  color: 'var(--text-3)',
                  textDecoration: 'none',
                  padding: '7px 10px',
                  borderRadius: 6,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-5)', minWidth: 18 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.title}
              </a>
            ))}
          </aside>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {sections.map((section, i) => (
              <article key={section.id} id={section.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 14 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: 'var(--text-4)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: 'var(--text)',
                      margin: 0,
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {section.title}
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: 15.5,
                    color: 'var(--text-2)',
                    lineHeight: 1.75,
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .legal-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .legal-toc { position: static !important; max-height: none !important; overflow: visible !important; }
        }
      `}</style>
    </>
  );
}
