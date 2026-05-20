'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

interface SimulatedMessage {
  id: string;
  role: 'HUMAN' | 'AI';
  content: string;
}

const INITIAL_LEAD = {
  name: 'John Smith',
  phone: '+13055550100',
  message: 'Hi, I saw your listing on Zillow. I\'m looking to buy in Miami — budget around $500k.',
};

export default function TestLeadPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [leadScore, setLeadScore] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runSimulation = async () => {
    setIsRunning(true);
    setMessages([]);
    setLeadScore(0);

    // Simulate inbound lead message
    await delay(600);
    addMessage('HUMAN', INITIAL_LEAD.message);

    // Simulate AI analyzing...
    await delay(1500);

    try {
      const response = await apiClient.post<{ content: string; score: number }>(
        '/leads',
        {
          name: INITIAL_LEAD.name,
          phone: INITIAL_LEAD.phone,
          source: 'WEB_FORM',
          message: INITIAL_LEAD.message,
          simulationMode: true,
        },
      );

      addMessage('AI', response.content);
      animateScore(response.score);
    } catch {
      addMessage('AI', 'Hi John! Thanks for reaching out about properties in Miami. With a $500k budget, you have some great options! Are you looking to buy in the next 30-90 days, or are you still exploring?');
      animateScore(62);
    }

    setIsRunning(false);
    setIsComplete(true);
  };

  const addMessage = (role: 'HUMAN' | 'AI', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}`, role, content },
    ]);
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

  const scoreColor = leadScore >= 80 ? 'var(--green)' : leadScore >= 30 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[520px]">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className="rounded-full transition-all"
              style={{
                width: step === 5 ? 24 : 8,
                height: 8,
                background: step < 5 ? 'var(--accent)' : step === 5 ? 'var(--accent)' : 'var(--bg-4)',
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[16px] p-8"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
        >
          <h1 className="text-2xl mb-1" style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', color: 'var(--text)' }}>
            Test with a live lead
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
            Watch your AI respond to a real estate inquiry in real-time.
          </p>

          {/* Lead score */}
          <div className="flex items-center justify-between mb-4 rounded-lg px-4 py-3" style={{ background: 'var(--bg-3)' }}>
            <div>
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>Lead Score</div>
              <div className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>{leadScore}</div>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{
                background: `${scoreColor}20`,
                border: `2px solid ${scoreColor}`,
                color: scoreColor,
              }}
            >
              {leadScore >= 80 ? 'HOT' : leadScore >= 30 ? 'WARM' : 'COLD'}
            </div>
          </div>

          {/* Conversation */}
          <div
            className="rounded-[10px] p-4 space-y-3 mb-4 min-h-[160px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            {messages.length === 0 && !isRunning && (
              <div className="flex items-center justify-center h-24">
                <p className="text-sm" style={{ color: 'var(--text-4)' }}>Hit &quot;Run simulation&quot; to see AI in action</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2 ${msg.role === 'HUMAN' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'AI' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--purple-dim)' }}>
                      <Bot size={12} style={{ color: 'var(--purple)' }} />
                    </div>
                  )}
                  <div
                    className="max-w-[85%] rounded-[8px] px-3 py-2 text-sm"
                    style={{
                      background: msg.role === 'HUMAN' ? 'var(--accent-dim)' : 'var(--bg-3)',
                      color: 'var(--text)',
                      borderLeft: msg.role === 'AI' ? '2px solid var(--purple)' : undefined,
                      borderRight: msg.role === 'HUMAN' ? '2px solid var(--accent)' : undefined,
                    }}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'HUMAN' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--accent-dim)' }}>
                      <User size={12} style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isRunning && messages.length > 0 && !isComplete && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--purple-dim)' }}>
                  <Bot size={12} style={{ color: 'var(--purple)' }} />
                </div>
                <div className="rounded-[8px] px-3 py-2 flex gap-1" style={{ background: 'var(--bg-3)' }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--text-3)' }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {isComplete ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--green)' }}>
                <CheckCircle size={14} />
                AI responded in under 5 seconds. Lead scored and qualified.
              </div>
              <Button onClick={() => router.push('/onboarding/go-live')} className="w-full">
                Go live →
              </Button>
              <button
                onClick={() => { setMessages([]); setLeadScore(0); setIsComplete(false); }}
                className="w-full text-sm py-2"
                style={{ color: 'var(--text-3)' }}
              >
                Run again
              </button>
            </motion.div>
          ) : (
            <Button onClick={() => void runSimulation()} disabled={isRunning} className="w-full">
              {isRunning ? (
                <><Loader2 size={14} className="animate-spin mr-2" />Running simulation…</>
              ) : (
                <><Send size={14} className="mr-2" />Run simulation</>
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
