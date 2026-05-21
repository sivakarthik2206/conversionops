import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: {
    default: 'ConversionOps',
    template: '%s · ConversionOps',
  },
  description: 'AI lead conversion infrastructure for real estate professionals.',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect width=%2224%22 height=%2224%22 rx=%226%22 fill=%22%23e8ff47%22/%3E%3Cpath d=%22M12 2L22 7v10l-10 5L2 17V7l10-5z%22 fill=%22none%22 stroke=%22%230a0a0b%22 stroke-width=%221.6%22 stroke-linejoin=%22round%22/%3E%3Cpath d=%22M7 9.5l5 2.5 5-2.5M12 12v10%22 fill=%22none%22 stroke=%22%230a0a0b%22 stroke-width=%221.6%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
      },
    ],
  },
  robots: { index: false, follow: false },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
