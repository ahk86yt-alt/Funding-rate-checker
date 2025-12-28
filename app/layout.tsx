import './globals.css';
import type { Metadata } from 'next';

import AppHeader from '@/app/components/AppHeader';
import AlertRunner from '@/app/components/AlertRunner';

export const metadata: Metadata = {
  title: '資金調達率チェッカー',
  description: '暗号資産先物の資金調達率を一覧・監視できるチェッカー',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont',
          background: '#ffffff',
          color: '#111827',
        }}
      >
        {/* 共通ヘッダー */}
        <AppHeader />

        {/* 各ページ */}
        <main style={{ padding: 16 }}>{children}</main>

        {/* 常駐アラート監視 */}
        <AlertRunner />
      </body>
    </html>
  );
}
