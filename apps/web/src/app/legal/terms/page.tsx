import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — ConversionOps',
  description: 'ConversionOps terms of service and acceptable use policy.',
};

const SECTIONS = [
  {
    id: 'service',
    title: 'Service Description',
    body: `ConversionOps provides AI-powered lead conversion infrastructure for real estate agents and brokerages. The service includes AI response generation, lead qualification, appointment booking, CRM synchronization, and analytics. The service operates via SMS, voice, and web channels using Twilio, Google Vertex AI, and related providers.`,
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    body: `You may use ConversionOps only for lawful lead conversion activities related to real estate. You may not use the service to send unsolicited communications, violate TCPA or Fair Housing regulations, transmit harmful content, reverse engineer the platform, or resell access without written authorization. Violation of these terms results in immediate account suspension.`,
  },
  {
    id: 'compliance',
    title: 'Your Compliance Obligations',
    body: `While ConversionOps enforces TCPA quiet hours and opt-out detection automatically, you remain responsible for (1) obtaining valid consent before leads are entered into the system, (2) maintaining accurate contact records, (3) complying with state-specific telemarketing laws, and (4) ensuring your use of the platform complies with the Fair Housing Act. ConversionOps provides compliance infrastructure but does not provide legal advice.`,
  },
  {
    id: 'payment',
    title: 'Payment and Billing',
    body: `Setup fees are one-time and non-refundable once onboarding begins. Monthly subscription fees are billed in advance and non-refundable for partial months. You may cancel at any time; cancellation takes effect at the end of the current billing period. Overdue invoices incur 1.5% monthly interest. Prices are exclusive of applicable taxes.`,
  },
  {
    id: 'data',
    title: 'Data Ownership',
    body: `You own your lead data, conversation transcripts, and workspace configuration. ConversionOps processes this data on your behalf under the terms of our Data Processing Agreement (available on request). Upon cancellation, you may export your data within 90 days; after that, data is deleted per our retention policy. ConversionOps owns its platform, AI models, and infrastructure.`,
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    body: `ConversionOps is not liable for indirect, incidental, special, or consequential damages. Our total liability for any claim shall not exceed the fees paid in the three months preceding the claim. We are not liable for outages caused by third-party providers (Twilio, Google Cloud, Stripe) or for leads that do not convert. The service is provided "as is" without warranty of any kind beyond what is explicitly stated in an SLA agreement.`,
  },
  {
    id: 'termination',
    title: 'Termination',
    body: `Either party may terminate this agreement with 30 days written notice. ConversionOps may terminate immediately for: TCPA violations, non-payment exceeding 15 days, illegal use, or abuse of platform resources. Upon termination, your access is suspended immediately and data is retained per the Privacy Policy retention schedule.`,
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    body: `We may update these terms with 30 days notice via email. Continued use after the effective date constitutes acceptance. Material changes (pricing, data practices) require explicit acknowledgment in the dashboard.`,
  },
  {
    id: 'governing',
    title: 'Governing Law',
    body: `These terms are governed by the laws of the State of Delaware, USA. Disputes shall be resolved by binding arbitration under AAA Commercial Arbitration Rules, except for injunctive relief which may be sought in state or federal courts in Delaware.`,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: `For terms questions or legal notices: hello@conversionops.in. Registered address: ConversionOps Inc., Delaware, USA.`,
  },
];

export default function TermsPage() {
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
          Terms of Service
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
