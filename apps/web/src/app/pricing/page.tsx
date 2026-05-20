import Pricing from '@/components/sections/Pricing';

export const metadata = {
  title: 'Pricing — ConversionOps',
  description: 'Simple, transparent pricing. No long-term contracts.',
};

const FAQS = [
  { q: 'How long does setup take?', a: 'About 10 minutes. You get a phone number, configure your AI agent name and tone, and you are live.' },
  { q: 'Is there a contract?', a: 'No. Cancel anytime. Your AI stops responding immediately on cancellation.' },
  { q: 'What happens when a lead opts out?', a: 'ConversionOps detects opt-out keywords (STOP, QUIT, etc.) instantly and permanently stops all AI outreach to that number. TCPA compliance is built-in.' },
  { q: 'Does it work with Follow Up Boss?', a: 'Yes. Qualified leads and full conversation transcripts sync automatically on the Brokerage and Enterprise plans.' },
  { q: 'Can I have multiple agents?', a: 'Yes. The Brokerage plan supports up to 20 agents with intelligent routing based on language, geography, availability, and performance.' },
  { q: 'What if I already have a Twilio number?', a: 'We can provision a new number or you can port your existing number in. Contact support for porting.' },
];

export default function PricingPage() {
  return (
    <main style={{ background: 'var(--bg)', paddingTop: 80 }}>
      <Pricing />
      <section className="py-24 px-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-[32px] mb-12 text-center" style={{ color: 'var(--text)' }}>Frequently asked questions</h2>
          <div className="flex flex-col gap-px" style={{ background: 'var(--border)' }}>
            {FAQS.map(faq => (
              <details key={faq.q} className="group" style={{ background: 'var(--bg-2)' }}>
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none hover:bg-[var(--bg-3)] transition-colors">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{faq.q}</span>
                  <span className="text-lg shrink-0 ml-4" style={{ color: 'var(--text-3)' }}>+</span>
                </summary>
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
