'use client';

import { useEffect, useState } from 'react';

type User = { id: string; email: string };
type MeOk = { user: User };
type MeErr = { error: string };

export default function AuthBox() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [me, setMe] = useState<User | null>(null);
  const [status, setStatus] = useState<string>('');

  async function refreshMe() {
    const res = await fetch('/api/me', {
      cache: 'no-store',
      credentials: 'include',
    });

    const data = (await res.json().catch(() => null)) as (MeOk | MeErr | null);

    if (res.ok && data && 'user' in data) {
      setMe(data.user);
    } else {
      setMe(null);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  async function signup() {
    setStatus('');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.error ?? 'Signup failed');
      return;
    }

    setStatus('Signup success. Now login.');
  }

  async function login() {
    setStatus('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.error ?? 'Login failed');
      return;
    }

    setStatus('Login success');
    window.dispatchEvent(new Event('auth:changed'));
    await refreshMe();
  }

  async function logout() {
    setStatus('');
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error ?? 'Logout failed');
      return;
    }

    setStatus('Logged out');
    window.dispatchEvent(new Event('auth:changed'));
    setMe(null);
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Auth</div>

      {me ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14 }}>
            Logged in as <b>{me.email}</b>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            autoComplete="email"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password (min 6 chars)"
            type="password"
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            autoComplete="current-password"
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={signup}
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Signup
            </button>
            <button
              onClick={login}
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#111827',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Login
            </button>
          </div>
        </div>
      )}

      {status && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>{status}</div>
      )}
    </div>
  );
}
