const FEATURES = [
  { num: '01', title: '60-Second Response', desc: 'Every Zillow, Realtor.com, missed call, and web form lead gets an AI response before a competitor can blink.' },
  { num: '02', title: '7-Dimension Qualification', desc: 'Budget, timeline, financing, area, property type, urgency, and intent — gathered naturally over SMS, no forms.' },
  { num: '03', title: 'TCPA Compliant', desc: 'Built-in opt-out detection, quiet hours enforcement, and consent management. Legal by default, not an afterthought.' },
  { num: '04', title: 'Smart Routing', desc: 'Language match, geography, availability, and performance-based assignment. The right lead to the right agent every time.' },
  { num: '05', title: 'Human Takeover in One Click', desc: 'Agent takes over any conversation instantly. AI steps back, you step in. Full conversation history preserved.' },
  { num: '06', title: 'CRM Sync', desc: 'Qualified leads and full transcripts sync to Follow Up Boss automatically. No manual entry ever again.' },
  { num: '07', title: 'Fair Housing Built-In', desc: 'Every AI message passes Fair Housing Act compliance checks before sending. Zero liability exposure.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6" style={{ background: 'var(--bg-2)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--text-3)' }}>What We Do</p>
          <h2 className="font-display italic text-[52px] leading-tight" style={{ color: 'var(--text)' }}>The complete lead conversion stack</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((feat, i) => (
            <div
              key={feat.num}
              className={`rounded-[10px] border p-6 relative overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 ${i === 4 ? 'md:col-span-2' : ''}`}
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <div className="absolute top-4 right-4 font-display leading-none select-none" style={{ fontSize: 48, color: 'var(--bg-4)' }}>{feat.num}</div>
              <div className="relative z-10 pr-12">
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{feat.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
