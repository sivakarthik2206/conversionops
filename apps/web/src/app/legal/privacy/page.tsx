import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { LegalShell } from '@/components/legal/LegalShell';

export const metadata = {
  title: 'Privacy Policy — ConversionOps',
  description: 'ConversionOps privacy policy and data practices.',
};

const SECTIONS = [
  { id: 'collect', title: 'Information we collect', body: 'We collect information you provide directly — including business name, email, phone number, and payment details. We also collect lead data processed through our platform on your behalf, including names, phone numbers, and conversation transcripts.' },
  { id: 'use', title: 'How we use your information', body: "Your data is used exclusively to provide and improve the ConversionOps service. We do not sell, rent, or share your data or your leads' data with third parties for marketing purposes." },
  { id: 'tcpa', title: 'TCPA compliance', body: 'All SMS communications require verified consent. Opt-out keywords (STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT) are detected immediately and result in permanent cessation of AI outreach. Quiet hours (9pm–8am local time) are enforced automatically.' },
  { id: 'retention', title: 'Data retention', body: 'Lead data is retained for the duration of your subscription plus 90 days. AuditLog records are retained for 7 years as required by law. You may request deletion at any time by contacting hello@conversionops.in.' },
  { id: 'ccpa', title: 'CCPA rights (California residents)', body: 'California residents have the right to know what personal information we collect, request deletion, and opt out of the sale of personal information (we do not sell personal information). Contact hello@conversionops.in with the subject line "CCPA Request".' },
  { id: 'security', title: 'Data security', body: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Our infrastructure runs exclusively on Google Cloud Platform in the US. Database credentials and API keys are stored in Google Secret Manager.' },
  { id: 'third-party', title: 'Third-party services', body: 'We use: Google Cloud Platform (infrastructure and AI), Twilio (SMS/voice), Stripe (payments), Resend (email), Cal.com (booking), and Follow Up Boss (CRM sync). Each processes data under their own privacy policies.' },
  { id: 'fair-housing', title: 'Fair Housing', body: 'Our AI is explicitly instructed never to discuss race, color, religion, national origin, sex, familial status, or disability. All outbound messages pass through a Fair Housing pre-send checklist.' },
  { id: 'contact', title: 'Contact', body: 'For privacy questions or data requests: hello@conversionops.in. Response time: 2 business days.' },
];

export default function PrivacyPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <LegalShell eyebrow="Legal · Privacy" title="Privacy Policy" updated="June 1, 2025" sections={SECTIONS} />
      <Footer />
    </main>
  );
}
