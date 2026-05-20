import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConversionOps — AI Lead Conversion for Real Estate',
  description:
    'Every inbound lead answered in 60 seconds. AI qualifies, books appointments, syncs to CRM. Replace your ISA for $750/month.',
  keywords: [
    'real estate AI',
    'lead conversion',
    'ISA replacement',
    'Zillow leads',
    'real estate automation',
  ],
  openGraph: {
    title: 'ConversionOps — AI Lead Conversion for Real Estate',
    description:
      'Every inbound lead answered in 60 seconds. AI qualifies, books appointments, syncs to CRM. Replace your ISA for $750/month.',
    url: 'https://conversionops.in',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ConversionOps — AI Lead Conversion for Real Estate',
    description:
      'Every inbound lead answered in 60 seconds. AI qualifies, books appointments, syncs to CRM.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
