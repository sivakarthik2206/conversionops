'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface SimMessage { id: string; role: 'HUMAN' | 'AI'; content: string; }

const INITIAL_LEAD = {
  name: 'John Smith',
  phone: '+13055550100',
  message: "Hi, I saw your listing on Zillow. I'm looking to buy in Miami — budget around $500k.",
};

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export default function TestLeadPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [leadScore, setLeadScore] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'HUMAN' | 'AI', content: string) => {
    setMessages(prev => [...prev, { id: `${role}-${Date.now()}-${Math.random()}`, role, content }]);
  };

  const animateScore = (target: number) => {
    let current = 0;
    const step = target / 40;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setLeadScore(Math.round(current));
      if (current >= target) clearInterval(interval);
    }, 30);
  };

  const runSimulation = async () => {
    setIsRunning(true);
    setMessages([]);
    setLeadScore(0);

    await delay(600);
    addMessage('HUMAN', INITIAL_LEAD.message);

    await delay(1500);

    try {
      const response = await apiClient.post<{ content: string; score: number }>('/leads', {
        name: INITIAL_LEAD.name,
        phone: INITIAL_LEAD.phone,
        source: 'WEB_FORM',
        message: INITIAL_LEAD.message,
        simulationMode: true,
      });
      addMessage('AI', response.content);
      animateScore(response.score);
    } catch {
      addMessage(
        'AI',
        "Hi John! Thanks for reaching out about properties in Miami. With a $500k budget, you have great options. Are you looking to move in the next 30–90 days, or just exploring?",
      );
      animateScore(62);
    }

    setIsRunning(false);
    setIsComplete(true);
  };

  const scoreColor = leadScore >= 80 ? 'var(--green)' : leadScore >= 50 ? 'var(--accent)' : leadScore >= 30 ? 'var(--amber)' : 'var(--red)';
  const tier = leadScore >= 80 ? 'HOT' : leadScore >= 30 ? 'WARM' : 'COLD';

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 10 }}>Step 5 · Test</p>
      <h1
        className="serif"
        style={{
          fontSize: 'clamp(32px, 4.5vw, 44px)',
          color: 'var(--text)',
          margin: '0 0 12px',
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
        }}
      >
        Watch it work on a{' '}
        <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
          real lead.
        </span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.55 }}>
        Run a simulation with a sample inbound lead. Your AI responds and scores it live.
      </p>

      <div className="surface-card" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
        {/* Score row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 12,
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            marginBottom: 14,
            position: 'relative',
          }}
        >
          <div>
            <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 2 }}>Lead score</div>
            <div
              className="serif"
              style={{
                fontSize: 28,
                lineHeight: 1,
                color: scoreColor,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 500,
                textShadow: `0 0 14px ${scoreColor}55`,
              }}
            >
              {leadScore}
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 100,
              background: `${scoreColor}14`,
              border: `1px solid ${scoreColor}33`,
              color: scoreColor,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Icon name={leadScore >= 80 ? 'fire' : 'target'} size={11} stroke={2} />
            {tier}
          </div>
        </div>

        {/* Chat */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 14,
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {messages.length === 0 && !isRunning && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--text-4)',
                padding: '32px 16px',
                textAlign: 'center',
              }}
            >
              Click &quot;Run simulation&quot; to see your AI in action.
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map(msg => {
              const isHuman = msg.role === 'HUMAN';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: isHuman ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-start',
                  }}
                >
                  {!isHuman && (
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--purple), #8b6fff)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon name="bot" size={10} stroke={2} />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '8px 12px',
                      borderRadius: isHuman ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: isHuman ? '#0a0a0b' : 'var(--text)',
                      background: isHuman
                        ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                        : 'var(--bg-3)',
                      border: isHuman ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isRunning && messages.length > 0 && !isComplete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--purple), #8b6fff)',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Icon name="bot" size={10} stroke={2} />
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 4px', background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--text-3)',
                      animation: 'typing 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.18}s`,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 100,
                background: 'rgba(77,255,165,0.10)',
                border: '1px solid rgba(77,255,165,0.30)',
                color: 'var(--green)',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                alignSelf: 'flex-start',
              }}
            >
              <Icon name="check" size={11} stroke={2.4} />
              AI responded in under 5 seconds
            </div>
            <button onClick={() => router.push('/onboarding/go-live')} className="btn-primary" style={{ width: '100%', height: 48 }}>
              Go live
              <Icon name="arrow-right" size={14} stroke={2.2} />
            </button>
            <button
              onClick={() => { setMessages([]); setLeadScore(0); setIsComplete(false); }}
              style={{
                width: '100%',
                height: 36,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-3)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              Run again
            </button>
          </motion.div>
        ) : (
          <button
            onClick={() => void runSimulation()}
            disabled={isRunning}
            className="btn-primary"
            style={{ width: '100%', height: 48 }}
          >
            {isRunning ? (
              <>
                <Icon name="loader" size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                Running simulation…
              </>
            ) : (
              <>
                <Icon name="play" size={12} />
                Run simulation
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
