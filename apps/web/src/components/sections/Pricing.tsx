import React from 'react';

const PLANS = [
  {
    name: 'Solo Agent',
    setup: '$3,500',
    monthly: '$750/mo',
    description: 'For individual agents ready to stop losing leads at night and weekends.',
    features: [
      'AI responds in < 60 seconds, 24/7',
      'SMS + email lead qualification',
      '7-question scoring system',
      'Cal.com appointment booking',
      '2M AI tokens/month',
      'Twilio number included',
    ],
    cta: 'Get started →',
    featured: false,
  },
  {
    name: 'Brokerage',
    setup: '$12,000',
    monthly: '$2,500/mo',
    description: 'For brokerages routing leads across agents automatically.',
    features: [
      'Everything in Solo',
      'Multi-agent routing engine',
      'Follow Up Boss CRM sync',
      'Priority + language routing',
      '10M AI tokens/month',
      'Dedicated onboarding',
      'Custom AI persona per agent',
    ],
    cta: 'Book a demo →',
    featured: true,
  },
  {
    name: 'Enterprise',
    setup: 'Custom',
    monthly: 'Custom pricing',
    description: 'For multi-office brokerages and teams with custom compliance requirements.',
    features: [
      'Everything in Brokerage',
      'Unlimited AI tokens',
      'SLA guarantee',
      'Custom compliance review',
      'White-label AI persona',
      'Dedicated support engineer',
    ],
    cta: 'Contact sales →',
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>Pricing</p>
          <h2 className="text-4xl mb-4" style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', color: 'var(--text)' }}>
            One flat rate. No per-lead fees.
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-2)' }}>
            Setup covers everything. Monthly covers hosting, AI, and support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-[16px] p-6 flex flex-col"
              style={{
                background: plan.featured ? 'var(--bg-2)' : 'var(--bg-2)',
                border: plan.featured ? '2px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: plan.featured ? 'var(--shadow-accent)' : 'none',
              }}
            >
              {plan.featured && (
                <div
                  className="text-xs font-semibold px-3 py-1 rounded-full self-start mb-4"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                >
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>{plan.name}</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>{plan.description}</p>

              <div className="mb-2">
                <span className="text-3xl font-bold" style={{ fontFamily: "'DM Serif Display', serif", color: plan.featured ? 'var(--accent)' : 'var(--text)' }}>
                  {plan.setup}
                </span>
                <span className="text-sm ml-1" style={{ color: 'var(--text-3)' }}>setup</span>
              </div>
              <div className="mb-6">
                <span className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{plan.monthly}</span>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                    <span style={{ color: 'var(--green)' }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="/book"
                className="block text-center py-3 rounded-[8px] text-sm font-semibold transition-all"
                style={{
                  background: plan.featured ? 'var(--accent)' : 'transparent',
                  color: plan.featured ? 'var(--bg)' : 'var(--text)',
                  border: plan.featured ? 'none' : '1px solid var(--border)',
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
