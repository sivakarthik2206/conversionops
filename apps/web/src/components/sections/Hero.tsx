'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';

const STATS = [
  { value: '60s', label: 'First response' },
  { value: '3×',  label: 'More appointments' },
  { value: '78%', label: 'Contact rate' },
  { value: '24/7', label: 'Always answering' },
];

const ROTATING = ['captured.', 'closed.', 'booked.', 'won.'];
const CITIES = ['Miami', 'Orlando', 'Tampa', 'San Diego', 'Austin'];

export default function Hero() {
  const [wordIdx, setWordIdx] = useState(0);
  const [cityIdx, setCityIdx] = useState(0);

  useEffect(() => {
    const w = setInterval(() => setWordIdx(i => (i + 1) % ROTATING.length), 2400);
    const c = setInterval(() => setCityIdx(i => (i + 1) % CITIES.length), 3000);
    return () => { clearInterval(w); clearInterval(c); };
  }, []);

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        paddingTop: 120,
        paddingBottom: 100,
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Aurora mesh background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--grad-mesh-1)',
          zIndex: -2,
          pointerEvents: 'none',
        }}
      />

      {/* Grid texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 0%, transparent 80%)',
          zIndex: -2,
          pointerEvents: 'none',
        }}
      />

      {/* Floating glow orbs */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '-8%',
          width: 620,
          height: 620,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,255,71,0.10) 0%, transparent 65%)',
          filter: 'blur(80px)',
          animation: 'float 22s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: '-10%',
          width: 540,
          height: 540,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(179,155,255,0.10) 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'floatSlow 26s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      <div className="grain" />

      <div
        className="container-page"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          alignItems: 'center',
          gap: 64,
        }}
      >
        {/* LEFT: copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 640 }}>
          {/* City ticker chip */}
          <div className="chip animate-fade-up" style={{ alignSelf: 'flex-start' }}>
            <span
              style={{
                position: 'relative',
                width: 8,
                height: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  animation: 'pulseRing 1.8s ease-out infinite',
                  opacity: 0.6,
                }}
              />
              <span
                style={{
                  position: 'relative',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  boxShadow: '0 0 8px var(--green)',
                }}
              />
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Live in</span>
            <span style={{ position: 'relative', overflow: 'hidden', height: 16, minWidth: 70, display: 'inline-block' }}>
              {CITIES.map((c, i) => (
                <span
                  key={c}
                  style={{
                    position: i === cityIdx ? 'relative' : 'absolute',
                    top: 0, left: 0,
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: 12,
                    opacity: i === cityIdx ? 1 : 0,
                    transform: i === cityIdx ? 'translateY(0)' : 'translateY(-100%)',
                    transition: 'opacity 0.5s, transform 0.5s var(--ease-out-quart)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c}
                </span>
              ))}
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--border-light)' }} />
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>v1.0 shipping</span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up delay-100 serif"
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 'clamp(48px, 7.2vw, 92px)',
              lineHeight: 0.98,
              letterSpacing: '-0.035em',
              color: 'var(--text)',
              margin: 0,
              fontWeight: 400,
            }}
          >
            Every lead<br />
            <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', 'DM Serif Display', Georgia, serif" }}>
              answered.
            </span>{' '}
            Every deal
            <br />
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                minWidth: '6ch',
                height: '1em',
                verticalAlign: 'baseline',
              }}
            >
              {ROTATING.map((word, i) => (
                <span
                  key={word}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    color: 'var(--accent)',
                    fontStyle: 'italic',
                    fontFamily: "'Instrument Serif', 'DM Serif Display', Georgia, serif",
                    opacity: i === wordIdx ? 1 : 0,
                    transform: i === wordIdx ? 'translateY(0)' : 'translateY(40%)',
                    transition: 'opacity 0.6s, transform 0.6s var(--ease-out-expo)',
                    textShadow: '0 0 60px rgba(232,255,71,0.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {word}
                </span>
              ))}
            </span>
          </h1>

          {/* Subhead */}
          <p
            className="animate-fade-up delay-200"
            style={{
              fontSize: 'clamp(17px, 1.5vw, 20px)',
              fontWeight: 400,
              color: 'var(--text-2)',
              lineHeight: 1.55,
              maxWidth: 540,
              margin: 0,
            }}
          >
            ConversionOps is the AI lead conversion infrastructure for real estate.
            It responds to every inbound lead in 60 seconds &mdash; qualifies, books, syncs to CRM &mdash; while your agents focus on closings.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up delay-300"
            style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
          >
            <a href="https://cal.com/siva-karthik-angarayan-olmzzm/conversionops-demo" target="_blank" rel="noopener noreferrer" className="btn-primary">
              Schedule
              <Icon name="arrow-right" size={16} stroke={2.2} />
            </a>
            <a href="#demo" className="btn-ghost">
              <Icon name="play" size={12} />
              Watch 60-second demo
            </a>
          </div>

          {/* Trust line */}
          <div
            className="animate-fade-up delay-400"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 12,
              color: 'var(--text-4)',
              marginTop: 4,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="shield" size={14} stroke={1.6} style={{ color: 'var(--green)' }} />
              TCPA compliant
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-5)' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="home" size={14} stroke={1.6} style={{ color: 'var(--blue)' }} />
              Fair Housing certified
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-5)' }} />
            <span>Setup in 10 min</span>
          </div>
        </div>

        {/* RIGHT: Live preview card */}
        <div
          className="animate-fade-up delay-300 hide-on-mobile"
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* Halo behind device */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '20%',
              right: '20%',
              bottom: '10%',
              background: 'radial-gradient(ellipse at center, rgba(232,255,71,0.20) 0%, transparent 65%)',
              filter: 'blur(40px)',
              zIndex: -1,
              animation: 'glow 5s ease-in-out infinite',
            }}
          />

          {/* Device frame */}
          <div
            style={{
              width: 360,
              minHeight: 580,
              borderRadius: 36,
              padding: 12,
              background: 'linear-gradient(160deg, #25252e 0%, #14141a 50%, #0d0d12 100%)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-xl), inset 0 1px 0 rgba(255,255,255,0.06)',
              position: 'relative',
              transform: 'perspective(1400px) rotateY(-6deg) rotateX(4deg)',
            }}
          >
            {/* Notch */}
            <div
              style={{
                position: 'absolute',
                top: 18,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 110,
                height: 24,
                borderRadius: 20,
                background: '#000',
                zIndex: 4,
              }}
            />

            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 26,
                minHeight: 556,
                padding: 18,
                paddingTop: 56,
                color: 'var(--text)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  fontSize: 11,
                  color: 'var(--text-3)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span>9:41</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 16, height: 8, borderRadius: 2, border: '1px solid currentColor' }} />
                </span>
              </div>

              {/* Contact header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(232,255,71,0.25)',
                  }}
                >
                  A
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Alex · Premier Realty</div>
                  <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
                    Active now
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Bubble side="them" delay="0.6s">
                  Hey, just submitted an inquiry on the 3BR in Coral Gables ✨
                </Bubble>
                <TimeStamp delay="1.1s">2:14 PM &middot; just now</TimeStamp>
                <Bubble side="me" delay="1.4s">
                  Hi Sarah! Saw your inquiry — great choice, that one&apos;s gorgeous. Quick Q so I can prep:
                  <br />are you pre-approved already?
                </Bubble>
                <TypingBubble delay="2.6s" />
                <Bubble side="them" delay="3.6s">
                  Yes, $850k. Hoping to move in ~60 days
                </Bubble>
                <Bubble side="me" delay="4.4s">
                  Perfect. I&apos;m booking you with Sarah Chen, our Coral Gables specialist.
                  Tomorrow 2:00 PM work?
                </Bubble>
                <Bubble side="me" delay="5.2s" highlight>
                  ✓ Appointment confirmed &mdash; Tomorrow 2:00 PM
                </Bubble>
              </div>

              {/* Input bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 18,
                  right: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 18,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  color: 'var(--text-4)',
                }}
              >
                <Icon name="message" size={14} />
                <span>Text message</span>
              </div>
            </div>
          </div>

          {/* Floating metrics */}
          <FloatingMetric
            position={{ top: '4%', left: '-8%' }}
            label="Response time"
            value="00:00:47"
            color="var(--green)"
            icon="clock"
            delay={0.6}
          />
          <FloatingMetric
            position={{ bottom: '8%', right: '-6%' }}
            label="Lead score"
            value="94 / 100"
            color="var(--accent)"
            icon="target"
            delay={0.9}
          />
        </div>
      </div>

      {/* Stats strip */}
      <div
        className="container-page animate-fade-up delay-500"
        style={{ marginTop: 80, position: 'relative' }}
      >
        <div
          className="stats-strip"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            padding: '28px 0',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            position: 'relative',
          }}
        >
          {/* edge fades */}
          <div style={{ position: 'absolute', left: 0, top: -1, bottom: -1, width: 60, background: 'linear-gradient(90deg, var(--bg), transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: -1, bottom: -1, width: 60, background: 'linear-gradient(-90deg, var(--bg), transparent)', pointerEvents: 'none' }} />

          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                textAlign: 'center',
                padding: '0 20px',
                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div
                className="serif"
                style={{
                  fontSize: 'clamp(28px, 3.4vw, 40px)',
                  lineHeight: 1,
                  color: 'var(--accent)',
                  marginBottom: 8,
                  textShadow: '0 0 24px rgba(232,255,71,0.20)',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-3)',
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          opacity: 0.45,
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-3)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Scroll
        </span>
        <Icon name="arrow-down" size={14} style={{ animation: 'bounce 1.8s ease-in-out infinite', color: 'var(--text-3)' }} />
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .hide-on-mobile { display: none !important; }
          section > div.container-page { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .stats-strip { grid-template-columns: repeat(2, 1fr) !important; row-gap: 24px !important; }
          .stats-strip > div:nth-child(2n) { border-right: none !important; }
        }
      `}</style>
    </section>
  );
}

function Bubble({
  children,
  side,
  delay,
  highlight,
}: { children: React.ReactNode; side: 'me' | 'them'; delay: string; highlight?: boolean }) {
  const isMe = side === 'me';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        opacity: 0,
        animation: `popIn 0.5s var(--ease-out-expo) ${delay} forwards`,
      }}
    >
      <div
        style={{
          maxWidth: '82%',
          padding: '8px 12px',
          borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          fontSize: 12.5,
          lineHeight: 1.45,
          color: isMe ? '#0a0a0b' : 'var(--text)',
          background: highlight
            ? 'linear-gradient(135deg, var(--green) 0%, #6affb8 100%)'
            : isMe
            ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
            : 'var(--bg-3)',
          fontWeight: highlight ? 600 : 400,
          boxShadow: isMe ? '0 4px 14px rgba(232,255,71,0.18)' : 'none',
          border: isMe ? 'none' : '1px solid var(--border)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TypingBubble({ delay }: { delay: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        opacity: 0,
        animation: `popIn 0.4s var(--ease-out-expo) ${delay} forwards`,
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '14px 14px 14px 4px',
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          display: 'flex',
          gap: 4,
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--text-3)',
              animation: `typing 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TimeStamp({ children, delay }: { children: React.ReactNode; delay: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: 10,
        color: 'var(--text-4)',
        margin: '4px 0',
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        opacity: 0,
        animation: `fadeIn 0.4s ease ${delay} forwards`,
      }}
    >
      {children}
    </div>
  );
}

function FloatingMetric({
  position,
  label,
  value,
  color,
  icon,
  delay,
}: {
  position: React.CSSProperties;
  label: string;
  value: string;
  color: string;
  icon: 'clock' | 'target';
  delay: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 3,
        ...position,
        padding: '12px 16px',
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(20,20,26,0.95), rgba(13,13,18,0.95))',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: 0,
        animation: `fadeScale 0.7s var(--ease-out-expo) ${delay}s forwards, float ${8 + delay * 2}s ease-in-out ${delay + 1}s infinite`,
        minWidth: 160,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: `${color}1f`,
          border: `1px solid ${color}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={16} stroke={2} />
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-3)',
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
