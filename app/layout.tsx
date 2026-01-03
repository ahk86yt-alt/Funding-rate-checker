import './globals.css';
import type { Metadata } from 'next';
import AppHeader from './components/AppHeader';

export const metadata: Metadata = {
  title: '資金調達率チェッカー',
  description: '資金調達率の一覧・グラフ・アラート',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: '#ffffff', color: '#111827' }}>
        <AppHeader />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
