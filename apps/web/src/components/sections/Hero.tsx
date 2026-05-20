'use client';
export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
      {/* Background noise is in globals.css body::before */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232,255,71,0.06) 0%, transparent 70%)',
      }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center gap-6">
        {/* Badge */}
        <div className="animate-fade-up flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-widest font-medium"
          style={{ background: 'var(--accent-dim)', borderColor: 'var(--border-focus)', color: 'var(--accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
          Now live in Miami, Orlando, Tampa, San Diego
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 font-display italic leading-tight text-center"
          style={{ fontSize: 'clamp(48px, 8vw, 88px)', color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Every lead answered.<br />
          Every deal{' '}
          <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>captured.</span><br />
          Zero effort from you.
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up delay-200 max-w-[560px] text-center"
          style={{ fontSize: 20, color: 'var(--text-2)', fontWeight: 400, lineHeight: 1.6 }}>
          AI infrastructure for real estate agents. Every inbound lead gets a response in 60 seconds, 24/7. No missed calls. No lost deals.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-300 flex flex-wrap items-center justify-center gap-4 mt-2">
          <a href="#demo"
            className="h-12 px-8 text-base font-medium rounded-xl inline-flex items-center gap-2 transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg)', boxShadow: 'var(--shadow-accent)' }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget).style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget).style.background = 'var(--accent)'; }}>
            See it live in 60 seconds ?
          </a>
          <a href="#pricing" className="h-12 px-8 text-base font-medium rounded-xl inline-flex items-center border transition-colors hover:bg-[var(--bg-2)]"
            style={{ color: 'var(--text)', borderColor: 'var(--border-light)' }}>
            View pricing
          </a>
        </div>

        {/* Stats bar */}
        <div className="animate-fade-up delay-400 mt-12 w-full max-w-3xl border-t pt-8 grid grid-cols-2 md:grid-cols-4 gap-6"
          style={{ borderColor: 'var(--border)' }}>
          {[
            { value: '60s', label: 'AI response time' },
            { value: '3x', label: 'more appointments' },
            { value: '78%', label: 'first-responder rate' },
            { value: '$0', label: 'staff cost' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display leading-none mb-1" style={{ fontSize: 40, color: 'var(--text)' }}>
                {stat.value}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
