mport type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConversionOps — AI Lead Conversion Infrastructure",
  description: "Every lead answered. Every appointment booked. Zero effort from you.",
  metadataBase: new URL("https://conversionops.in"),
  openGraph: {
    title: "ConversionOps",
    description: "AI lead conversion infrastructure for real estate agents and brokerages.",
    url: "https://conversionops.in",
    siteName: "ConversionOps",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
