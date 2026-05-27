import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Pricing from '@/components/sections/Pricing';
import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

export const metadata = {
  title: 'Pricing — ConversionOps',
  description: 'Simple, transparent pricing. No long-term contracts.',
};

const FAQS = [
  { q: 'How long does setup take?',           a: 'About 10 minutes. You get a phone number, configure your AI agent name and tone, and you go live. Most teams are converting leads the same day.' },
  { q: 'Is there a contract?',                a: 'No. Cancel anytime. Your AI stops responding immediately on cancellation. We keep your data accessible for 90 days afterward.' },
  { q: 'What happens when a lead opts out?',  a: 'ConversionOps detects opt-out keywords (STOP, QUIT, UNSUBSCRIBE, CANCEL) instantly and permanently stops all AI outreach to that number. TCPA compliance is built in as an invariant, not a feature flag.' },
  { q: 'Does it work with Follow Up Boss?',   a: 'Yes. Qualified leads, scoring, and full conversation transcripts sync automatically on the Brokerage and Enterprise plans. We also support webhooks for custom CRMs.' },
  { q: 'Can I have multiple AI agents?',      a: 'Yes. The Brokerage plan supports up to 15 agents with intelligent routing based on language, geography, availability, and historical performance. Each can have a distinct persona.' },
  { q: 'What if I already have a Twilio number?', a: 'We can provision a new number or port your existing number. Contact support to start a porting request — most numbers move in 3–5 business days.' },
  { q: 'How is this different from a chatbot?', a: 'A chatbot lives on a webpage waiting for visitors. ConversionOps is infrastructure: it picks up every inbound SMS, missed call, and form submission within 60 seconds, qualifies the lead, books an appointment, and syncs to your CRM. It runs 24/7.' },
  { q: 'What if the AI makes a mistake?',     a: 'Every conversation is logged, every consequential action is in an audit trail, and you can escalate to a human at any point. The AI is conservative: when it is unsure, it routes the lead to you rather than guessing.' },
];

export default function PricingPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <section
        style={{
          paddingTop: 'clamp(140px, 18vw, 200px)',
          paddingBottom: 'clamp(48px, 6vw, 80px)',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '60%',
            background: 'radial-gradient(ellipse, rgba(232,255,71,0.08) 0%, transparent 65%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div className="container-page" style={{ position: 'relative' }}>
          <Reveal>
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>Pricing</span>
          </Reveal>
          <Reveal delay={1}>
            <h1
              className="serif"
              style={{
                fontSize: 'clamp(44px, 7vw, 84px)',
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                color: 'var(--text)',
                margin: '20px auto 20px',
                fontWeight: 400,
                maxWidth: 800,
              }}
            >
              Half the cost of an ISA.{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif" }}>
                Ten times the output.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ fontSize: 18, color: 'var(--text-2)', maxWidth: 540, margin: '0 auto', lineHeight: 1.55 }}>
              Transparent, simple, no contracts. Choose what scales with you &mdash; from solo agent to multi-market brokerage.
            </p>
          </Reveal>
        </div>
      </section>

      <Pricing />

      {/* FAQ */}
      <section style={{ padding: 'clamp(64px, 10vw, 120px) 0', background: 'var(--bg-2)', borderTop: '1px solid var(--border)' }}>
        <div className="container-page" style={{ maxWidth: 760 }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <span className="eyebrow" style={{ color: 'var(--text-3)' }}>Questions</span>
              <h2 className="serif t-h1" style={{ color: 'var(--text)', margin: '14px 0 0', fontWeight: 400 }}>
                Frequently asked
              </h2>
            </div>
          </Reveal>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              borderRadius: 16,
              border: '1px solid var(--border)',
              overflow: 'hidden',
              background: 'var(--bg)',
            }}
          >
            {FAQS.map((faq, i) => (
              <details
                key={faq.q}
                className="faq-item"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  background: 'transparent',
                }}
              >
                <summary
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    cursor: 'pointer',
                    listStyle: 'none',
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--text)',
                    transition: 'background 0.2s',
                  }}
                >
                  <span>{faq.q}</span>
                  <span
                    className="faq-icon"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.3s var(--ease-out-quart), background 0.2s, color 0.2s',
                    }}
                  >
                    <Icon name="plus" size={14} stroke={2} />
                  </span>
                </summary>
                <div style={{ padding: '0 24px 22px', fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 640 }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>

          {/* Talk-to-us */}
          <div
            style={{
              marginTop: 40,
              padding: 28,
              borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(232,255,71,0.05), transparent)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
                Still have questions?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '6px 0 0' }}>
                Book a 20-min call &mdash; we&apos;ll show the platform live with your numbers.
              </p>
            </div>
            <a href="https://calendar.app.google/qJw5n9evBZ8ciiuV9" target="_blank" rel="noopener noreferrer" className="btn-primary">
              Schedule
              <Icon name="arrow-right" size={14} stroke={2.2} />
            </a>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item[open] summary { background: var(--bg-2); }
        .faq-item[open] .faq-icon {
          transform: rotate(45deg);
          background: var(--accent-dim);
          color: var(--accent);
          border-color: var(--border-focus);
        }
        .faq-item summary:hover { background: var(--bg-2); }
      `}</style>
    </main>
  );
}
