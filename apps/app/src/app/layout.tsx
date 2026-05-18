import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConversionOps Dashboard",
  description: "AI Lead Conversion Infrastructure",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
