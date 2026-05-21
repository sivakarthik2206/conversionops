import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { LegalShell } from '../privacy/page';

export const metadata = {
  title: 'Terms of Service — ConversionOps',
  description: 'ConversionOps terms of service and acceptable use policy.',
};

const SECTIONS = [
  {
    id: 'service',
    title: 'Service description',
    body: `ConversionOps provides AI-powered lead conversion infrastructure for real estate agents and brokerages. The service includes AI response generation, lead qualification, appointment booking, CRM synchronization, and analytics. The service operates via SMS, voice, and web channels using Twilio, Google Vertex AI, and related providers.`,
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: `You may use ConversionOps only for lawful lead conversion activities related to real estate. You may not use the service to send unsolicited communications, violate TCPA or Fair Housing regulations, transmit harmful content, reverse engineer the platform, or resell access without written authorization. Violation of these terms results in immediate account suspension.`,
  },
  {
    id: 'compliance',
    title: 'Your compliance obligations',
    body: `While ConversionOps enforces TCPA quiet hours and opt-out detection automatically, you remain responsible for (1) obtaining valid consent before leads are entered into the system, (2) maintaining accurate contact records, (3) complying with state-specific telemarketing laws, and (4) ensuring your use of the platform complies with the Fair Housing Act. ConversionOps provides compliance infrastructure but does not provide legal advice.`,
  },
  {
    id: 'payment',
    title: 'Payment and billing',
    body: `Setup fees are one-time and non-refundable once onboarding begins. Monthly subscription fees are billed in advance and non-refundable for partial months. You may cancel at any time; cancellation takes effect at the end of the current billing period. Overdue invoices incur 1.5% monthly interest. Prices are exclusive of applicable taxes.`,
  },
  {
    id: 'data',
    title: 'Data ownership',
    body: `You own your lead data, conversation transcripts, and workspace configuration. ConversionOps processes this data on your behalf under the terms of our Data Processing Agreement (available on request). Upon cancellation, you may export your data within 90 days; after that, data is deleted per our retention policy. ConversionOps owns its platform, AI models, and infrastructure.`,
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: `ConversionOps is not liable for indirect, incidental, special, or consequential damages. Our total liability for any claim shall not exceed the fees paid in the three months preceding the claim. We are not liable for outages caused by third-party providers (Twilio, Google Cloud, Stripe) or for leads that do not convert. The service is provided "as is" without warranty of any kind beyond what is explicitly stated in an SLA agreement.`,
  },
  {
    id: 'termination',
    title: 'Termination',
    body: `Either party may terminate this agreement with 30 days written notice. ConversionOps may terminate immediately for: TCPA violations, non-payment exceeding 15 days, illegal use, or abuse of platform resources. Upon termination, your access is suspended immediately and data is retained per the Privacy Policy retention schedule.`,
  },
  {
    id: 'changes',
    title: 'Changes to terms',
    body: `We may update these terms with 30 days notice via email. Continued use after the effective date constitutes acceptance. Material changes (pricing, data practices) require explicit acknowledgment in the dashboard.`,
  },
  {
    id: 'governing',
    title: 'Governing law',
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
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <LegalShell
        eyebrow="Legal · Terms"
        title="Terms of Service"
        updated="May 20, 2026"
        sections={SECTIONS}
      />
      <Footer />
    </main>
  );
}
