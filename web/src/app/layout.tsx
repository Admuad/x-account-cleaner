import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vanishx.vercel.app'),
  title: 'VanishX | Autonomous 𝕏 Timeline Purge & Bot Cleanser',
  description: 'High-speed, client-side 𝕏 account cleaner. Wipe historical posts before any date, unfollow bots & non-mutuals with zero serverless limits.',
  keywords: ['VanishX', 'X account cleaner', 'Twitter tweet deleter', 'mass unfollow non mutuals', 'bot detector', 'delete old tweets', 'X purge', 'timeline wipe'],
  authors: [{ name: 'Admuad', url: 'https://x.com/adedir2' }],
  creator: 'Admuad',
  openGraph: {
    title: 'VanishX | Autonomous 𝕏 Timeline Purge & Bot Cleanser',
    description: 'High-speed, client-side 𝕏 account cleaner. Wipe historical posts before any date, unfollow bots & non-mutuals with zero serverless limits.',
    url: 'https://vanishx.vercel.app',
    siteName: 'VanishX',
    images: [
      {
        url: 'https://vanishx.vercel.app/og-image.jpg',
        secureUrl: 'https://vanishx.vercel.app/og-image.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'VanishX — Autonomous 𝕏 Timeline Purge & Clean Slate Engine',
      },
      {
        url: 'https://vanishx.vercel.app/og-square.jpg',
        secureUrl: 'https://vanishx.vercel.app/og-square.jpg',
        width: 600,
        height: 600,
        type: 'image/jpeg',
        alt: 'VanishX App Icon',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VanishX | Autonomous 𝕏 Timeline Purge & Bot Cleanser',
    description: 'High-speed, client-side 𝕏 account cleaner. Wipe historical posts before any date, unfollow bots & non-mutuals with zero serverless limits.',
    images: ['https://vanishx.vercel.app/og-image.jpg'],
    creator: '@adedir2',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-space-black text-space-text font-sans antialiased min-h-screen selection:bg-coral selection:text-white">
        {children}
      </body>
    </html>
  );
}
