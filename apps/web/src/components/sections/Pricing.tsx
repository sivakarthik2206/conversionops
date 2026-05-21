'use client';

import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

interface Plan {
  name: string;
  badge: string | null;
  setup: string;
  monthly: string;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Solo Agent',
    badge: null,
    setup: '$3,500',
    monthly: '$750',
    desc: 'For agents ready to stop losing leads at night and on weekends.',
    features: [
      '1 AI agent persona',
      'Zillow + missed call intake',
      'Qualification + booking',
      'Follow Up Boss sync',
      '2M tokens / month',
      'Email support',
    ],
    cta: 'Start free trial',
    ctaHref: '/book',
    featured: false,
  },
  {
    name: 'Small Brokerage',
    badge: 'Most popular',
    setup: '$12,000',
    monthly: '$2,500',
    desc: 'For brokerages routing leads across agents with full analytics.',
    features: [
      'Everything in Solo',
      'Up to 15 agents',
      'Advanced routing rules',
      'Agent performance analytics',
      '10M tokens / month',
      'Custom AI persona per agent',
      'Priority support · 4-hr SLA',
    ],
    cta: 'Start free trial',
    ctaHref: '/book',
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
      '99.95% SLA guarantee',
      'Single sign-on (SAML)',
    ],
    cta: 'Contact sales',
    ctaHref: 'mailto:hello@conversionops.in',
    featured: false,
  },
];

const TRUST = [
  { icon: 'lock' as const, label: 'TCPA compliant' },
  { icon: 'home' as const, label: 'Fair Housing certified' },
  { icon: 'bolt' as const, label: '99.9% uptime SLA' },
  { icon: 'shield' as const, label: 'SOC 2 in progress' },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        padding: 'clamp(80px, 12vw, 160px) 0',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(ellipse, rgba(232,255,71,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-page" style={{ position: 'relative' }}>
        {/* Header */}
        <Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, marginBottom: 72 }}>
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>Pricing</span>
            <h2 className="serif t-h1" style={{ color: 'var(--text)', margin: 0, fontWeight: 400, maxWidth: 700 }}>
              Less than half an{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif" }}>
                ISA.
              </span>{' '}
              Ten times the throughput.
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55, margin: 0 }}>
              No long-term contract. Cancel anytime. Setup, training, and onboarding are included in every plan.
            </p>
          </div>
        </Reveal>

        {/* Plans */}
        <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch', marginBottom: 56 }}>
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={((i + 1) as 1 | 2 | 3)}>
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>

        {/* Trust row */}
        <Reveal delay={2}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 32,
              flexWrap: 'wrap',
              paddingTop: 40,
              borderTop: '1px solid var(--border)',
            }}
          >
            {TRUST.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={item.icon} size={16} stroke={1.6} style={{ color: 'var(--text-3)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 960px) { .price-grid { grid-template-columns: 1fr !important; max-width: 480px; margin-left: auto; margin-right: auto; } }
      `}</style>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      style={{
        background: plan.featured
          ? 'linear-gradient(180deg, rgba(232,255,71,0.06) 0%, var(--bg-2) 60%)'
          : 'linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%)',
        border: '1px solid',
        borderColor: plan.featured ? 'var(--accent)' : 'var(--border)',
        borderRadius: 20,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: plan.featured
          ? '0 24px 80px rgba(232,255,71,0.18), 0 4px 12px rgba(232,255,71,0.08), inset 0 1px 0 rgba(232,255,71,0.20)'
          : 'var(--shadow-sm)',
        height: '100%',
        transition: 'transform 0.4s var(--ease-out-quart), box-shadow 0.4s var(--ease-soft)',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        if (plan.featured) {
          el.style.transform = 'translateY(-6px)';
          el.style.boxShadow = '0 32px 96px rgba(232,255,71,0.28), 0 8px 16px rgba(232,255,71,0.12), inset 0 1px 0 rgba(232,255,71,0.30)';
        } else {
          el.style.transform = 'translateY(-4px)';
          el.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = plan.featured
          ? '0 24px 80px rgba(232,255,71,0.18), 0 4px 12px rgba(232,255,71,0.08), inset 0 1px 0 rgba(232,255,71,0.20)'
          : 'var(--shadow-sm)';
      }}
    >
      {/* Featured halo */}
      {plan.featured && (
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -120,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,255,71,0.18), transparent 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Badge */}
      {plan.badge && (
        <div
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 100,
            background: 'linear-gradient(180deg, var(--accent-soft), var(--accent))',
            color: '#0a0a0b',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            boxShadow: '0 4px 14px rgba(232,255,71,0.40)',
          }}
        >
          <Icon name="sparkle" size={10} stroke={2.4} />
          {plan.badge}
        </div>
      )}

      {/* Plan name */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: plan.featured ? 'var(--accent)' : 'var(--text-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          marginBottom: 16,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {plan.name}
      </div>

      {/* Setup price */}
      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          className="serif"
          style={{
            fontSize: plan.featured ? 56 : 48,
            lineHeight: 0.9,
            color: plan.featured ? 'var(--accent)' : 'var(--text)',
            fontWeight: 400,
            textShadow: plan.featured ? '0 0 30px rgba(232,255,71,0.30)' : 'none',
          }}
        >
          {plan.setup}
        </span>
        {plan.setup !== 'Custom' && (
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>one-time setup</span>
        )}
      </div>

      {/* Monthly */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>then</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{plan.monthly}</span>
        {plan.monthly !== "Let's talk" && (
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/ month</span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {plan.desc}
      </p>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--border-light), transparent)',
          marginBottom: 20,
        }}
      />

      {/* Features */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        {plan.features.map(feature => (
          <li
            key={feature}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13.5,
              color: 'var(--text-2)',
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: plan.featured ? 'var(--accent)' : 'rgba(77,255,165,0.16)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: plan.featured ? '#0a0a0b' : 'var(--green)',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Icon name="check" size={10} stroke={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={plan.ctaHref}
        className={plan.featured ? 'btn-primary' : 'btn-ghost'}
        style={{ width: '100%', justifyContent: 'center', height: 48 }}
      >
        {plan.cta}
        <Icon name="arrow-right" size={14} stroke={2.2} />
      </a>
    </div>
  );
}
