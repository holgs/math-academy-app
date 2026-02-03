import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

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
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}