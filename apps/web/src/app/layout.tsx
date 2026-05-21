import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://conversionops.in'),
  title: {
    default: 'ConversionOps — AI Lead Conversion for Real Estate',
    template: '%s · ConversionOps',
  },
  description:
    'Every inbound real estate lead answered in 60 seconds. AI qualifies, books appointments, syncs to CRM. The operating system for lead conversion.',
  keywords: [
    'real estate AI',
    'lead conversion',
    'ISA replacement',
    'Zillow leads',
    'real estate automation',
    'AI lead response',
    'TCPA compliant',
    'real estate CRM',
  ],
  authors: [{ name: 'ConversionOps' }],
  creator: 'ConversionOps',
  openGraph: {
    title: 'ConversionOps — AI Lead Conversion for Real Estate',
    description:
      'Every inbound lead answered in 60 seconds. AI qualifies, books appointments, syncs to CRM.',
    url: 'https://conversionops.in',
    siteName: 'ConversionOps',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ConversionOps — AI Lead Conversion for Real Estate',
    description:
      'Every inbound lead answered in 60 seconds. AI qualifies, books appointments, syncs to CRM.',
    creator: '@conversionops',
  },
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect width=%2224%22 height=%2224%22 rx=%226%22 fill=%22%23e8ff47%22/%3E%3Cpath d=%22M12 2L22 7v10l-10 5L2 17V7l10-5z%22 fill=%22none%22 stroke=%22%230a0a0b%22 stroke-width=%221.6%22 stroke-linejoin=%22round%22/%3E%3Cpath d=%22M7 9.5l5 2.5 5-2.5M12 12v10%22 fill=%22none%22 stroke=%22%230a0a0b%22 stroke-width=%221.6%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
      },
    ],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#07070a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <div className="grain" />
      </body>
    </html>
  );
}
