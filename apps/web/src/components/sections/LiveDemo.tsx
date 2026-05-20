'use client';
import { useEffect, useRef, useCallback, useState } from 'react';

type StatusStep = {
  label: string;
  color: string;
  bg: string;
  icon: string;
};

const STATUS_STEPS: StatusStep[] = [
  { label: 'Lead received', color: 'var(--text-2)', bg: 'var(--bg-4)', icon: '●' },
  { label: 'AI processing...', color: 'var(--amber)', bg: 'var(--amber-dim)', icon: '◎' },
  { label: 'Message sent', color: 'var(--green)', bg: 'var(--green-dim)', icon: '✓' },
  { label: 'Lead scored: 74/100 HOT', color: 'var(--amber)', bg: 'var(--amber-dim)', icon: '🔥' },
  { label: 'Routed to agent', color: 'var(--blue)', bg: 'var(--blue-dim)', icon: '→' },
];

type ChatMsg = {
  id: number;
  role: 'ai' | 'lead' | 'booking';
  text: string;
};

const CHAT_MSGS: { delay: number; msg: ChatMsg }[] = [
  {
    delay: 2500,
    msg: {
      id: 1,
      role: 'ai',
      text: "Hi Sarah! I'm Alex, an AI assistant for Miami Premier Realty. I saw you were interested in a 3BR in Coral Gables — great choice! Are you looking to buy in the next 30–90 days, or just exploring your options?",
    },
  },
  {
    delay: 8000,
    msg: {
      id: 2,
      role: 'lead',
      text: "We're hoping to move in about 60 days. Already pre-approved for $850k.",
    },
  },
  {
    delay: 11000,
    msg: {
      id: 3,
      role: 'ai',
      text: "That's perfect timing! With $850k pre-approved, you'll have great options in Coral Gables. Quick question — are you also open to South Miami or Coconut Grove, or strictly Coral Gables?",
    },
  },
  {
    delay: 16000,
    msg: {
      id: 4,
      role: 'lead',
      text: 'Coral Gables preferred but open to Coconut Grove.',
    },
  },
  {
    delay: 19000,
    msg: {
      id: 5,
      role: 'ai',
      text: "Got it! I'm pulling up availability for Sarah Chen, our Coral Gables specialist. Here's a link to book a 15-min call at your convenience: cal.com/miami-premier/sarah",
    },
  },
  {
    delay: 22000,
    msg: {
      id: 6,
      role: 'booking',
      text: '✓ Appointment Booked — Tomorrow 2:00 PM with Sarah Chen',
    },
  },
];

const STATUS_DELAYS = [0, 1000, 2500, 4000, 5500];

export default function LiveDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [statuses, setStatuses] = useState<number[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [key, setKey] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const clearAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const startDemo = useCallback(() => {
    clearAll();
    setElapsed(0);
    setStatuses([]);
    setMessages([]);

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);

    STATUS_DELAYS.forEach((delay, idx) => {
      const t = setTimeout(() => {
        setStatuses(prev => [...prev, idx]);
      }, delay);
      timersRef.current.push(t);
    });

    CHAT_MSGS.forEach(({ delay, msg }) => {
      const t = setTimeout(() => {
        setMessages(prev => [...prev, msg]);
      }, delay);
      timersRef.current.push(t);
    });

    const endT = setTimeout(() => {
      clearAll();
    }, 28000);
    timersRef.current.push(endT);
  }, [clearAll]);

  const handleRestart = useCallback(() => {
    clearAll();
    setKey(k => k + 1);
    setRunning(true);
  }, [clearAll]);

  useEffect(() => {
    if (running) startDemo();
  }, [running, key, startDemo]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !running) {
            setRunning(true);
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [running]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => () => clearAll(), [clearAll]);

  const timerColor =
    elapsed < 60 ? 'var(--green)' : elapsed < 120 ? 'var(--amber)' : 'var(--red)';

  return (
    <section
      id="demo"
      ref={sectionRef}
      style={{ padding: '120px 24px', background: 'var(--bg-2)' }}
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
            Live Demo
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
            Watch it happen in real time
          </h2>
          <p style={{ marginTop: 14, fontSize: 16, color: 'var(--text-2)' }}>
            No signup. No demo call. See the actual AI respond to a lead right now.
          </p>
        </div>

        {/* Two panels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
          }}
        >
          {/* LEFT: Incoming Lead */}
          <div
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--amber)',
                  boxShadow: '0 0 8px var(--amber)',
                  animation: 'pulseDot 2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                New lead incoming
              </span>
            </div>

            {/* Lead card */}
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border-light)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                    Sarah Mitchell
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: 'var(--blue-dim)',
                        color: 'var(--blue)',
                      }}
                    >
                      Zillow
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>just now</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>Response timer</div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 20,
                      fontWeight: 600,
                      color: timerColor,
                      transition: 'color 0.5s ease',
                      minWidth: 48,
                    }}
                  >
                    {elapsed}s
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Property', value: '3BR in Coral Gables, Miami' },
                  { label: 'Phone', value: '+1 (305) ***-4821' },
                  { label: 'Source', value: 'Zillow Premier Agent' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-4)',
                      borderRadius: 6,
                      padding: '6px 10px',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Processing pipeline
              </div>
              {STATUS_STEPS.map((step, idx) => {
                const visible = statuses.includes(idx);
                const isProcessing = idx === 1 && statuses.includes(1) && !statuses.includes(2);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 12px',
                      borderRadius: 8,
                      background: visible ? step.bg : 'var(--bg-4)',
                      border: `1px solid ${visible ? step.color.replace('var(', '').replace(')', '') === '--green' ? 'rgba(71,255,142,0.2)' : 'var(--border)' : 'transparent'}`,
                      opacity: visible ? 1 : 0.3,
                      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: visible ? step.color : 'var(--text-4)',
                        animation: isProcessing ? 'pulseDot 1s ease-in-out infinite' : 'none',
                      }}
                    >
                      {step.icon}
                    </span>
                    <span style={{ fontSize: 13, color: visible ? step.color : 'var(--text-4)', fontWeight: visible ? 500 : 400 }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: AI Conversation */}
          <div
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header bar */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  SMS Conversation
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Powered by Gemini 1.5 Flash</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--green)',
                    boxShadow: '0 0 6px var(--green)',
                    animation: 'pulseDot 2s ease-in-out infinite',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)' }}>Live</span>
              </div>
            </div>

            {/* Chat messages */}
            <div
              ref={chatRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 320,
                maxHeight: 420,
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-4)',
                    fontSize: 13,
                    textAlign: 'center',
                    padding: 24,
                  }}
                >
                  Waiting for AI to respond…
                </div>
              )}
              {messages.map(msg => {
                if (msg.role === 'booking') {
                  return (
                    <div
                      key={msg.id}
                      className="animate-pop-in"
                      style={{
                        background: 'var(--green-dim)',
                        border: '1px solid rgba(71,255,142,0.25)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--green)',
                        textAlign: 'center',
                      }}
                    >
                      {msg.text}
                    </div>
                  );
                }
                const isAi = msg.role === 'ai';
                return (
                  <div
                    key={msg.id}
                    className="animate-pop-in"
                    style={{
                      display: 'flex',
                      justifyContent: isAi ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '9px 13px',
                        borderRadius: 10,
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: 'var(--text)',
                        background: isAi ? 'var(--bg-2)' : 'var(--accent-dim)',
                        borderLeft: isAi ? '2px solid var(--purple)' : 'none',
                        borderRight: !isAi ? '2px solid var(--accent)' : 'none',
                      }}
                    >
                      {isAi && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--purple)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            marginBottom: 5,
                          }}
                        >
                          AI · Alex
                        </div>
                      )}
                      {msg.text.includes('cal.com') ? (
                        <span>
                          {msg.text.replace('cal.com/miami-premier/sarah', '')}{' '}
                          <a
                            href="#"
                            style={{ color: 'var(--blue)', textDecoration: 'underline' }}
                            onClick={e => e.preventDefault()}
                          >
                            cal.com/miami-premier/sarah
                          </a>
                        </span>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Restart button */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleRestart}
                style={{
                  width: '100%',
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--bg-4)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = 'var(--accent-dim)';
                  el.style.color = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = 'var(--bg-4)';
                  el.style.color = 'var(--text-3)';
                }}
              >
                ↺ Restart demo
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #demo .two-panel { grid-template-columns: 1fr !important; }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </section>
  );
}
