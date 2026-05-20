import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConversionOps → AI Lead Conversion for Real Estate',
  description: 'Every inbound lead answered in 60 seconds. Every deal captured. Zero effort from you.',
  openGraph: {
    title: 'ConversionOps → AI Lead Conversion',
    description: 'AI infrastructure for real estate agents. 60s response time, 24/7.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
