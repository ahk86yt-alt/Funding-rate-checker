'use client';

import { useEffect, useState } from 'react';
import FundingTable from './components/FundingTable';
import AuthBox from './components/AuthBox';
import AlertPanel from './components/AlertPanel';

export type SymbolSortMode = 'marketcap' | 'alpha';

type User = {
  id: string;
  email: string;
};

export default function HomePage() {
  // 並び替えモード
  const [sortMode, setSortMode] =
    useState<SymbolSortMode>('marketcap');

  // ログインユーザー
  const [user, setUser] = useState<User | null>(null);

  // ログイン状態取得
  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      });
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Funding App
      </h1>

      {/* 認証UI */}
      <div style={{ marginBottom: 24 }}>
        <AuthBox />
      </div>

      {/* 並び替え UI */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 600, color: '#374151' }}>
          並び替え
        </span>

        <select
          value={sortMode}
          onChange={(e) =>
            setSortMode(e.target.value as SymbolSortMode)
          }
          style={{
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: '#ffffff',
            fontSize: 14,
          }}
        >
          <option value="marketcap">時価総額順</option>
          <option value="alpha">アルファベット順</option>
        </select>
      </div>

      {/* Funding Table */}
      <FundingTable sortMode={sortMode} />

      {/* ===== アラート機能（ログイン時のみ） ===== */}
      {user && (
        <AlertPanel userId={user.id} />
      )}
    </main>
  );
}
