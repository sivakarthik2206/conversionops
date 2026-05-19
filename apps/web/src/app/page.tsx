import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/sections/Hero';
import PainPoints from '@/components/sections/PainPoints';
import LiveDemo from '@/components/sections/LiveDemo';
import Features from '@/components/sections/Features';
import Pricing from '@/components/sections/Pricing';
import Footer from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <main style={{ background: 'var(--bg)' }}>
      <Navbar />
      <Hero />
      <PainPoints />
      <LiveDemo />
      <Features />
      <Pricing />
      {/* CTA Section */}
      <section className="py-24 px-6 text-center" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(232,255,71,0.06) 0%, transparent 70%)' }}>
        <h2 className="font-display italic text-[52px] leading-tight mb-4" style={{ color: 'var(--text)' }}>
          Start converting leads today
        </h2>
        <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
          Setup takes 10 minutes. No contract. Your AI is live the same day.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/demo" className="h-12 px-8 text-base font-medium rounded-xl inline-flex items-center transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg)', boxShadow: 'var(--shadow-accent)' }}>
            See it live ?
          </a>
          <a href="#pricing" className="h-12 px-8 text-base font-medium rounded-xl inline-flex items-center border transition-colors"
            style={{ color: 'var(--text)', borderColor: 'var(--border-light)' }}>
            View pricing
          </a>
        </div>
      </section>
      <Footer />
    </main>
  );
}
