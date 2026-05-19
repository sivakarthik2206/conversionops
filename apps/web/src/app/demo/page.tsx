import LiveDemo from '@/components/sections/LiveDemo';

export const metadata = {
  title: 'Live Demo — ConversionOps',
  description: 'See the AI in action. No signup required.',
};

export default function DemoPage() {
  return (
    <main style={{ background: 'var(--bg)', paddingTop: 80 }}>
      <div className="text-center px-6 pt-12 pb-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-widest font-medium mb-6"
          style={{ background: 'var(--green-dim)', borderColor: 'rgba(71,255,142,0.3)', color: 'var(--green)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
          No signup required
        </div>
        <h1 className="font-display italic text-[52px] leading-tight mb-4" style={{ color: 'var(--text)' }}>
          Watch the AI work
        </h1>
        <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
          This is a live simulation using the actual ConversionOps AI engine.
        </p>
      </div>
      <LiveDemo />
      <div className="text-center pb-24 px-6">
        <h2 className="font-display text-[32px] mb-4" style={{ color: 'var(--text)' }}>Ready to go live?</h2>
        <p className="text-base mb-8" style={{ color: 'var(--text-2)' }}>Setup takes 10 minutes. First lead response in 60 seconds.</p>
        <a href="/pricing" className="h-12 px-8 text-base font-medium rounded-xl inline-flex items-center transition-colors"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
          View pricing ?
        </a>
      </div>
    </main>
  );
}
