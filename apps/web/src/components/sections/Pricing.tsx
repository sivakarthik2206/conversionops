const PLANS = [
  {
    name: 'Solo Agent',
    badge: null,
    setup: '$3,500',
    monthly: '$750/mo',
    desc: 'For individual agents ready to stop losing leads at night and on weekends.',
    features: [
      '1 AI agent',
      'Zillow + missed call intake',
      'Qualification + booking',
      'Follow Up Boss sync',
      '2M tokens/month',
      'Email support',
    ],
    cta: 'Get started',
    featured: false,
  },
  {
    name: 'Small Brokerage',
    badge: 'Most Popular',
    setup: '$12,000',
    monthly: '$2,500/mo',
    desc: 'For brokerages routing leads across agents with full analytics.',
    features: [
      'Everything in Solo',
      'Up to 15 agents',
      'Advanced routing rules',
      'Agent performance analytics',
      'Priority support',
      '10M tokens/month',
      'Custom AI persona per agent',
    ],
    cta: 'Get started',
    featured: true,
  },
  {
    name: 'Enterprise',
    badge: null,
    setup: 'Custom',
    monthly: "Let's talk",
    desc: 'For large brokerages with custom compliance and integration needs.',
    features: [
      'Everything in Brokerage',
      'Unlimited agents',
      'White-label option',
      'Dedicated success manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact us',
    featured: false,
  },
];

const TRUST = [
  { icon: '🔒', text: 'TCPA compliant' },
  { icon: '🏠', text: 'Fair Housing certified' },
  { icon: '⚡', text: '99.9% uptime SLA' },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      style={{ padding: '120px 24px', background: 'var(--bg)' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              marginBottom: 16,
            }}
          >
            Pricing
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 'clamp(32px, 5vw, 48px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Simple, transparent pricing
          </h2>
          <p
            style={{
              marginTop: 14,
              fontSize: 16,
              color: 'var(--text-2)',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            No contracts. Cancel anytime. Setup included.
          </p>
        </div>

        {/* Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            alignItems: 'start',
            marginBottom: 56,
          }}
        >
          {PLANS.map(plan => (
            <div
              key={plan.name}
              style={{
                background: 'var(--bg-2)',
                border: plan.featured ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 12,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                position: 'relative',
                boxShadow: plan.featured ? 'var(--shadow-accent)' : 'none',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  style={{
                    position: 'absolute',
                    top: -1,
                    right: 24,
                    background: 'var(--accent)',
                    color: '#000',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '4px 10px',
                    borderRadius: '0 0 6px 6px',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 16,
                }}
              >
                {plan.name}
              </div>

              {/* Setup price */}
              <div style={{ marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: plan.featured ? 48 : 40,
                    lineHeight: 1,
                    color: plan.featured ? 'var(--accent)' : 'var(--text)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {plan.setup}
                </span>
                {plan.setup !== 'Custom' && (
                  <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 6 }}>setup</span>
                )}
              </div>

              {/* Monthly */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
                  + {plan.monthly}
                </span>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 20, margin: '0 0 20px' }}>
                {plan.desc}
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map(feature => (
                  <li
                    key={feature}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text-2)' }}
                  >
                    <span style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="/book"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: plan.featured ? 'var(--accent)' : 'transparent',
                  color: plan.featured ? '#000' : 'var(--text-2)',
                  border: plan.featured ? 'none' : '1px solid var(--border-light)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  if (plan.featured) {
                    el.style.filter = 'brightness(1.08)';
                  } else {
                    el.style.borderColor = 'var(--border-focus)';
                    el.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.filter = 'brightness(1)';
                  el.style.borderColor = 'var(--border-light)';
                  el.style.color = plan.featured ? '#000' : 'var(--text-2)';
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap',
            paddingTop: 32,
            borderTop: '1px solid var(--border)',
          }}
        >
          {TRUST.map(item => (
            <div
              key={item.text}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
