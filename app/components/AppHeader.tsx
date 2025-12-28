'use client';

import Link from 'next/link';

export default function AppHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'block',
          padding: '14px 16px',
          fontSize: 18,
          fontWeight: 800,
          color: '#111827',
          textDecoration: 'none',
        }}
      >
        資金調達率チェッカー
      </Link>
    </header>
  );
}
