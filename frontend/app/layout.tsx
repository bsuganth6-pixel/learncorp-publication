import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Self-hosted (not next/font/google) so the build has no external network
// dependency and the browser makes no third-party font request at runtime.
// Source: Google Fonts' official GitHub repo (OFL-licensed) — see assets/fonts/NOTICE.md.
const fraunces = localFont({
  src: '../assets/fonts/Fraunces-Variable.ttf',
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = localFont({
  src: '../assets/fonts/Inter-Variable.ttf',
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'LearnCorp Publication — Your Story. Your Knowledge. Your Book.',
    template: '%s | LearnCorp Publication',
  },
  description:
    'A publishing platform for authors: professional book editing, formatting, cover design, ISBN assistance, and worldwide digital & print distribution.',
  openGraph: {
    title: 'LearnCorp Publication',
    description: 'A platform for authors to transform ideas and manuscripts into professionally published books.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
