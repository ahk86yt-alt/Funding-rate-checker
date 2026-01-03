'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type User = { id: string; email: string } | null;

export default function HeaderNavClient() {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const pill = (bg: string, color: string) => ({
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: bg,
    fontWeight: 900,
    textDecoration: 'none' as const,
    color,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  });

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Link href="/" style={pill('#fff', '#111827')}>
        レート一覧
      </Link>

      <Link href="/alerts" style={pill('#fff', '#111827')}>
        アラート管理
      </Link>

      {/* 表示は常に「ログイン」だが、ログイン済みなら /account に飛ばす */}
      <Link
        href={user ? '/account' : '/login'}
        style={pill(user ? '#f9fafb' : '#111827', user ? '#111827' : '#fff')}
      >
        ログイン
      </Link>
    </div>
  );
}
