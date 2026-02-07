import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MathFlow - Impara Matematica 4x Più Veloce',
  description: 'Apprendimento attivo, gamificato e personalizzato per la matematica',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
        />
      </head>
      <body className={inter.className}>
        <Script
          src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"
          strategy="afterInteractive"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
