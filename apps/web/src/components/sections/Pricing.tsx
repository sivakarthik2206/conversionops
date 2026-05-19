const PLANS = [
  {
    name: 'Solo',
    price: '$149',
    monthly: '$99/mo',
    desc: 'Perfect for individual agents',
    featured: false,
    features: [
      '1 AI phone number',
      'Up to 200 leads/month',
      '2M AI tokens/month',
      'SMS + web form intake',
      'Basic qualification',
      'Email support',
    ],
  },
  {
    name: 'Brokerage',
    price: '$499',
    monthly: '$299/mo',
    desc: 'For teams of 2–20 agents',
    featured: true,
    features: [
      'Up to 20 AI phone numbers',
      'Unlimited leads',
      '10M AI tokens/month',
      'Multi-agent routing',
      'Follow Up Boss sync',
      'Priority support + onboarding',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    monthly: 'Talk to us',
    desc: 'Large brokerages and franchises',
    featured: false,
    features: [
      'Unlimited numbers & agents',
      'Unlimited tokens',
      'Custom AI persona',
      'White-label option',
      'SLA guarantee',
      'Dedicated success manager',
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--text-3)' }}>Pricing</p>
          <h2 className="font-display italic text-[52px] leading-tight" style={{ color: 'var(--text)' }}>Simple, transparent pricing</h2>
          <p className="mt-4 text-base" style={{ color: 'var(--text-2)' }}>No long-term contracts. Cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name} className="rounded-[16px] border p-6 flex flex-col relative"
              style={{
                background: plan.featured ? 'linear-gradient(to bottom, var(--accent-dim-2), var(--bg-2))' : 'var(--bg-2)',
                borderColor: plan.featured ? 'var(--accent)' : 'var(--border)',
                boxShadow: plan.featured ? 'var(--shadow-accent)' : 'none',
              }}>
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--text-3)' }}>{plan.name}</p>
                <div className="font-display leading-none mb-1" style={{ fontSize: 52, color: 'var(--text)' }}>{plan.price}</div>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{plan.monthly}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>{plan.desc}</p>
              </div>
              <ul className="flex flex-col gap-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                    <span style={{ color: 'var(--green)', flexShrink: 0 }}>?</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/demo"
                className="w-full h-10 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                style={{
                  background: plan.featured ? 'var(--accent)' : 'transparent',
                  color: plan.featured ? 'var(--bg)' : 'var(--text)',
                  border: plan.featured ? 'none' : '1px solid var(--border)',
                }}>
                Get started
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-8" style={{ color: 'var(--text-3)' }}>
          Pays for itself with one saved deal. Average commission: $12,000.
        </p>
      </div>
    </section>
  );
}
