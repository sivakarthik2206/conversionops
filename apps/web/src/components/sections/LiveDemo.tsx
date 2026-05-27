'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Icon } from '@/components/Icon';

type StatusStep = {
  label: string;
  detail: string;
  tone: 'idle' | 'work' | 'ok' | 'hot' | 'info';
  icon: 'bolt' | 'cpu' | 'check' | 'fire' | 'arrow-right';
};

const STATUS_STEPS: StatusStep[] = [
  { label: 'Lead received',   detail: 'Zillow webhook, 0.12s',                tone: 'idle', icon: 'bolt' },
  { label: 'AI processing',   detail: 'Gemini 1.5 Flash · context 18kT',       tone: 'work', icon: 'cpu' },
  { label: 'Message sent',    detail: 'Twilio · MessageSid received',          tone: 'ok',   icon: 'check' },
  { label: 'Lead scored',     detail: '74 / 100 · HOT',                         tone: 'hot',  icon: 'fire' },
  { label: 'Routed to agent', detail: 'Sarah Chen · Coral Gables',              tone: 'info', icon: 'arrow-right' },
];

const TONE: Record<StatusStep['tone'], { color: string; bg: string; border: string }> = {
  idle: { color: 'var(--text-2)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border)' },
  work: { color: 'var(--amber)',  bg: 'var(--amber-dim)',       border: 'rgba(255,181,71,0.25)' },
  ok:   { color: 'var(--green)',  bg: 'var(--green-dim)',       border: 'rgba(77,255,165,0.25)' },
  hot:  { color: 'var(--red)',    bg: 'var(--red-dim)',         border: 'rgba(255,92,92,0.30)' },
  info: { color: 'var(--blue)',   bg: 'var(--blue-dim)',        border: 'rgba(90,163,255,0.25)' },
};

type ChatMsg = {
  id: number;
  role: 'ai' | 'lead' | 'booking';
  text: string;
  ts?: string;
};

const CHAT_MSGS: { delay: number; msg: ChatMsg; typing?: number }[] = [
  { delay: 2500, msg: { id: 1, role: 'ai', text: "Hi Sarah! I'm Alex with Miami Premier Realty. Saw you were interested in a 3BR in Coral Gables — beautiful choice. Are you looking to buy in the next 30–90 days, or just starting to explore?", ts: '2:14 PM' } },
  { delay: 7600, msg: { id: 2, role: 'lead', text: "We're hoping to move in about 60 days. Already pre-approved for $850k.", ts: '2:14 PM' } },
  { delay: 10500, msg: { id: 3, role: 'ai', text: "Perfect timing! $850k gives you great options in Coral Gables. Are you open to South Miami or Coconut Grove, or strictly Coral Gables?", ts: '2:14 PM' } },
  { delay: 15200, msg: { id: 4, role: 'lead', text: 'Coral Gables preferred but open to Coconut Grove.', ts: '2:15 PM' } },
  { delay: 18000, msg: { id: 5, role: 'ai', text: "Got it — I'm connecting you with Sarah Chen, our Coral Gables specialist. Sending a calendar link now.", ts: '2:15 PM' } },
  { delay: 21500, msg: { id: 6, role: 'booking', text: 'Appointment booked · Tomorrow 2:00 PM with Sarah Chen', ts: '2:16 PM' } },
];

const STATUS_DELAYS = [0, 800, 2400, 4200, 5800];

export default function LiveDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [statuses, setStatuses] = useState<number[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [reset, setReset] = useState(0);
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
    setTyping(false);

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);

    STATUS_DELAYS.forEach((delay, idx) => {
      const t = setTimeout(() => setStatuses(prev => [...prev, idx]), delay);
      timersRef.current.push(t);
    });

    CHAT_MSGS.forEach(({ delay, msg }) => {
      if (msg.role === 'ai') {
        const tStart = setTimeout(() => setTyping(true), Math.max(0, delay - 1200));
        timersRef.current.push(tStart);
      }
      const t = setTimeout(() => {
        if (msg.role === 'ai') setTyping(false);
        setMessages(prev => [...prev, msg]);
      }, delay);
      timersRef.current.push(t);
    });

    const endT = setTimeout(() => clearAll(), 26000);
    timersRef.current.push(endT);
  }, [clearAll]);

  const handleRestart = useCallback(() => {
    clearAll();
    setReset(k => k + 1);
    setRunning(true);
  }, [clearAll]);

  useEffect(() => { if (running) startDemo(); }, [running, reset, startDemo]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting && !running) setRunning(true); }),
      { threshold: 0.25 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [running]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, typing]);

  useEffect(() => () => clearAll(), [clearAll]);

  const timerColor = elapsed < 60 ? 'var(--green)' : elapsed < 120 ? 'var(--amber)' : 'var(--red)';
  const timerDisplay = `00:${String(elapsed).padStart(2, '0')}`;

  return (
    <section
      id="demo"
      ref={sectionRef}
      style={{
        padding: 'clamp(80px, 12vw, 160px) 0',
        background: 'var(--bg-2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--accent-glow), transparent)',
        }}
      />
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: '70%',
          background: 'radial-gradient(ellipse at center, rgba(232,255,71,0.05) 0%, transparent 60%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-page" style={{ position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <span className="eyebrow" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="sparkle" size={14} stroke={2} />
            Live demo · not a recording
          </span>
          <h2 className="serif t-h1" style={{ color: 'var(--text)', margin: 0, fontWeight: 400, maxWidth: 740 }}>
            Watch it happen in{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif" }}>
              real time.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55, margin: 0 }}>
            A Zillow lead lands. The same AI you&apos;ll use, on the same infrastructure you&apos;ll deploy, responds in under a minute.
          </p>
        </div>

        {/* Two panels */}
        <div className="demo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 20 }}>
          {/* LEFT: Operations panel */}
          <div className="surface-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ position: 'relative', width: 8, height: 8 }}>
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'var(--amber)',
                      animation: 'pulseRing 1.6s ease-out infinite',
                      opacity: 0.6,
                    }}
                  />
                  <span style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)' }} />
                </span>
                <span className="eyebrow" style={{ color: 'var(--text-2)', letterSpacing: '0.10em' }}>Inbound · live</span>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--text-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                wkr-prod-01
              </div>
            </div>

            {/* Lead identity card */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border-light)',
                borderRadius: 14,
                padding: 18,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 15,
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(90,163,255,0.30)',
                    }}
                  >
                    SM
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Sarah Mitchell</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'var(--blue-dim)',
                          color: 'var(--blue)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Zillow
                      </span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-5)' }} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>just now</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="eyebrow" style={{ color: 'var(--text-4)', marginBottom: 4 }}>Response timer</div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 22,
                      fontWeight: 600,
                      color: timerColor,
                      transition: 'color 0.6s ease',
                      minWidth: 80,
                      textShadow: `0 0 24px ${timerColor}55`,
                    }}
                  >
                    {timerDisplay}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { k: 'Property',  v: '3BR · Coral Gables' },
                  { k: 'Budget',    v: '$850k pre-approved' },
                  { k: 'Phone',     v: '+1 (305) ***-4821' },
                  { k: 'Timeline',  v: '~60 days' },
                ].map(({ k, v }) => (
                  <div
                    key={k}
                    style={{
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <div className="eyebrow" style={{ color: 'var(--text-4)', fontSize: 9, marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="eyebrow" style={{ color: 'var(--text-4)', marginBottom: 2 }}>Processing pipeline</div>
              {STATUS_STEPS.map((step, idx) => {
                const visible = statuses.includes(idx);
                const tone = TONE[step.tone];
                const isCurrent = visible && idx === statuses[statuses.length - 1] && idx < STATUS_STEPS.length - 1;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: visible ? tone.bg : 'transparent',
                      border: '1px solid',
                      borderColor: visible ? tone.border : 'var(--border)',
                      opacity: visible ? 1 : 0.35,
                      transition: 'all 0.5s var(--ease-out-expo)',
                      transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isCurrent && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: `linear-gradient(90deg, transparent, ${tone.color}22, transparent)`,
                          animation: 'shimmer 1.6s linear infinite',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: visible ? `${tone.color}1f` : 'var(--bg-3)',
                        border: `1px solid ${visible ? tone.border : 'var(--border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: visible ? tone.color : 'var(--text-4)',
                        transition: 'all 0.4s var(--ease-soft)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={step.icon} size={13} stroke={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: visible ? 'var(--text)' : 'var(--text-4)' }}>
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: visible ? tone.color : 'var(--text-5)',
                          marginTop: 2,
                          opacity: visible ? 0.85 : 0.5,
                        }}
                      >
                        {step.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Conversation */}
          <div
            className="surface-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    color: '#0a0a0b',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(232,255,71,0.30)',
                  }}
                >
                  A
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>SMS · Alex (AI)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                    Gemini 1.5 Flash · 128k context
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulseDot 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', letterSpacing: '0.04em' }}>LIVE</span>
              </div>
            </div>

            {/* Chat */}
            <div
              ref={chatRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 18px 80px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 420,
                maxHeight: 520,
                background: 'linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%)',
              }}
            >
              {messages.length === 0 && !typing && (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    color: 'var(--text-4)',
                    fontSize: 13,
                    padding: 32,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '2px solid var(--border-light)',
                      borderTopColor: 'var(--accent)',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span>Waiting for AI to respond&hellip;</span>
                </div>
              )}

              {messages.map(msg => {
                if (msg.role === 'booking') {
                  return (
                    <div
                      key={msg.id}
                      className="animate-pop-in"
                      style={{
                        margin: '8px auto',
                        maxWidth: '92%',
                        background: 'linear-gradient(135deg, rgba(77,255,165,0.16), rgba(77,255,165,0.06))',
                        border: '1px solid rgba(77,255,165,0.32)',
                        borderRadius: 12,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'rgba(77,255,165,0.20)',
                          color: 'var(--green)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="calendar" size={14} stroke={2.2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{msg.text}</div>
                        {msg.ts && (
                          <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                            {msg.ts}
                          </div>
                        )}
                      </div>
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
                      flexDirection: 'column',
                      alignItems: isAi ? 'flex-start' : 'flex-end',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '10px 14px',
                        borderRadius: isAi ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        color: isAi ? 'var(--text)' : '#0a0a0b',
                        background: isAi
                          ? 'var(--bg-3)'
                          : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                        border: isAi ? '1px solid var(--border)' : 'none',
                        boxShadow: isAi ? 'none' : '0 4px 14px rgba(232,255,71,0.20)',
                      }}
                    >
                      {msg.text}
                    </div>
                    {msg.ts && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-4)',
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: isAi ? '0 4px' : '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {!isAi && <Icon name="check" size={10} stroke={2.5} style={{ color: 'var(--text-3)' }} />}
                        {msg.ts}
                        {isAi && <Icon name="check" size={10} stroke={2.5} style={{ color: 'var(--text-3)' }} />}
                      </div>
                    )}
                  </div>
                );
              })}

              {typing && (
                <div className="animate-pop-in" style={{ display: 'flex' }}>
                  <div
                    style={{
                      padding: '12px 16px',
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
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--text-3)',
                          animation: 'typing 1.2s ease-in-out infinite',
                          animationDelay: `${i * 0.18}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '14px 18px',
                borderTop: '1px solid var(--border)',
                background: 'linear-gradient(180deg, rgba(13,13,18,0.7), var(--bg-2))',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <button
                onClick={handleRestart}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: 'var(--bg-4)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.background = 'var(--accent-dim)';
                  el.style.borderColor = 'var(--border-focus)';
                  el.style.color = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.background = 'var(--bg-4)';
                  el.style.borderColor = 'var(--border-light)';
                  el.style.color = 'var(--text-2)';
                }}
              >
                <Icon name="reload" size={12} stroke={2} />
                Restart
              </button>
              <span style={{ flex: 1 }} />
              <a
                href="https://calendar.app.google/qJw5n9evBZ8ciiuV9"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(180deg, var(--accent-soft), var(--accent) 60%, var(--accent-2))',
                  color: '#0a0a0b',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(232,255,71,0.30)',
                }}
              >
                Schedule
                <Icon name="arrow-right" size={12} stroke={2.2} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .demo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
