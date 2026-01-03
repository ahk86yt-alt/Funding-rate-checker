'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  email: string;
  createdAt?: string;
};

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: 14,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function row(label: string, value: string) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 8 }}>
      <div style={{ width: 120, color: '#6b7280', fontSize: 12, fontWeight: 900 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default function AccountClient() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // forms
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  async function loadMe() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) {
        setUser(null);
        setLoading(false);
        return;
      }
      const json = await res.json();
      const u = json?.user as User | undefined;
      if (!u?.id) {
        setUser(null);
      } else {
        setUser(u);
        setEmail(u.email ?? '');
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function updateAccount() {
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/account/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          newPassword: newPassword.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error ?? `更新に失敗しました（${res.status}）`);
        return;
      }
      setMsg('更新しました');
      setNewPassword('');
      await loadMe();
    } catch (e: any) {
      setErr(e?.message ?? '更新に失敗しました');
    }
  }

  async function sendTestMail() {
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/mail/test', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error ?? `送信に失敗しました（${res.status}）`);
        return;
      }
      setMsg('テストメールを送信しました');
    } catch (e: any) {
      setErr(e?.message ?? '送信に失敗しました');
    }
  }

  async function logout() {
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErr(json?.error ?? `ログアウトに失敗しました（${res.status}）`);
        return;
      }
      setMsg('ログアウトしました');
      router.push('/login');
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'ログアウトに失敗しました');
    }
  }

  if (loading) {
    return <div style={{ padding: 8 }}>読み込み中…</div>;
  }

  // 未ログインなら /login へ
  if (!user) {
    return (
      <div style={{ padding: 8 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>アカウント</div>
        <div style={{ color: '#6b7280', marginBottom: 12 }}>ログインしてください。</div>
        <button
          type="button"
          onClick={() => router.push('/login')}
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#111827',
            color: '#fff',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          ログインページへ
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 8, display: 'grid', gap: 14 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>アカウント</div>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          ここでアカウント情報の確認・変更、テストメール送信、ログアウトができます。
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

      <Box title="アカウント情報">
        {row('ユーザーID', user.id)}
        {row('メール', user.email)}
        {row('作成日', user.createdAt ? new Date(user.createdAt).toLocaleString('ja-JP') : '-')}
      </Box>

      <Box title="アカウント情報変更">
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 900 }}>メール</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
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
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 900 }}>
              新しいパスワード（変更しない場合は空）
            </span>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード"
              type="password"
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
            onClick={updateAccount}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#111827',
              color: '#fff',
              fontWeight: 900,
              cursor: 'pointer',
              width: 180,
            }}
          >
            変更を保存
          </button>
        </div>
      </Box>

      <Box title="テストメール送信">
        <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>
          メール送信設定が正しく動作するか確認します（あなたのメール宛に送信）。
        </div>
        <button
          type="button"
          onClick={sendTestMail}
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            fontWeight: 900,
            cursor: 'pointer',
            width: 200,
          }}
        >
          テストメールを送信
        </button>
      </Box>

      <Box title="ログアウト">
        <button
          type="button"
          onClick={logout}
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            fontWeight: 900,
            cursor: 'pointer',
            width: 160,
          }}
        >
          ログアウト
        </button>
      </Box>
    </div>
  );
}
