'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: 16,
        background: '#fff',
      }}
    >
      {children}
    </div>
  );
}

export default function LoginClient() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // すでにログイン済みなら /account へ
  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.id) {
          router.replace('/account');
        }
      })
      .catch(() => {});
  }, [router]);

  async function submit() {
    setMsg('');
    setErr('');

    const e = email.trim();
    const p = password;

    if (!e || !p) {
      setErr('メールとパスワードを入力してください');
      return;
    }
    if (p.length < 6) {
      setErr('パスワードは6文字以上にしてください');
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: e, password: p }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(json?.error ?? `失敗しました（${res.status}）`);
        return;
      }

      setMsg(mode === 'login' ? 'ログインしました' : '登録しました');
      router.push('/account');
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? '失敗しました');
    } finally {
      setBusy(false);
    }
  }

  const pill = (active: boolean) => ({
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: active ? '#111827' : '#fff',
    color: active ? '#fff' : '#111827',
    fontWeight: 900,
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: 8, display: 'grid', gap: 14, maxWidth: 520, margin: '0 auto' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>ログイン / 会員登録</div>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
          既存ユーザーはログイン、新規の方は会員登録してください。
        </div>
      </div>

      {(msg || err) && (
        <div
          style={{
            border: '1px solid',
            borderColor: err ? '#fecaca' : '#bbf7d0',
            background: err ? '#fff1f2' : '#f0fdf4',
            color: err ? '#991b1b' : '#14532d',
            borderRadius: 12,
            padding: 10,
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {err || msg}
        </div>
      )}

      <Card>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button type="button" onClick={() => setMode('login')} style={pill(mode === 'login')}>
            ログイン
          </button>
          <button type="button" onClick={() => setMode('register')} style={pill(mode === 'register')}>
            会員登録
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 900 }}>メール</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              autoComplete="email"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                fontWeight: 800,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 900 }}>パスワード</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                fontWeight: 800,
              }}
            />
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#111827',
              color: '#fff',
              fontWeight: 900,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
              width: 200,
              marginTop: 6,
            }}
          >
            {busy ? '処理中…' : mode === 'login' ? 'ログイン' : '会員登録'}
          </button>
        </div>

        <div style={{ marginTop: 12, color: '#6b7280', fontSize: 12 }}>
          ※ 会員登録すると、そのままログイン状態になります。
        </div>
      </Card>
    </div>
  );
}
