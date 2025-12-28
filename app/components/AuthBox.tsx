"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
};

type Mode = "login" | "signup";

export default function AuthBox() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ★ 追加
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ログイン状態チェック
  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      });
  }, []);

  async function login() {
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("ログインに失敗しました");
      return;
    }

    const data = await res.json();
    setUser(data.user);
  }

  async function signup() {
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "登録に失敗しました");
      return;
    }

    await login();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setMode("login");
  }

  if (user) {
    return (
      <div style={box}>
        <p style={{ marginBottom: 8 }}>ログイン中</p>
        <strong>{user.email}</strong>

        <button onClick={logout} style={button}>
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div style={box}>
      <h3 style={{ marginBottom: 12 }}>
        {mode === "login" ? "ログイン" : "新規会員登録（無料）"}
      </h3>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={input}
      />

      {/* ★ パスワード入力 + 目アイコン */}
      <div style={passwordWrapper}>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={passwordInput}
        />

        <span
          onClick={() => setShowPassword((v) => !v)}
          style={eyeIcon}
          title={showPassword ? "隠す" : "表示"}
        >
          {showPassword ? "🙈" : "👁"}
        </span>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {mode === "login" ? (
        <>
          <button onClick={login} style={button} disabled={loading}>
            ログイン
          </button>

          <p style={switchText}>
            はじめての方は{" "}
            <span onClick={() => setMode("signup")} style={link}>
              新規登録
            </span>
          </p>
        </>
      ) : (
        <>
          <button onClick={signup} style={button} disabled={loading}>
            無料で登録
          </button>

          <p style={switchText}>
            すでにアカウントをお持ちの方は{" "}
            <span onClick={() => setMode("login")} style={link}>
              ログイン
            </span>
          </p>
        </>
      )}
    </div>
  );
}

/* =====================
   Styles
===================== */

const box = {
  padding: 16,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  maxWidth: 320,
};

const input = {
  display: "block",
  width: "100%",
  marginBottom: 8,
  padding: 6,
  border: "1px solid #d1d5db",
  borderRadius: 4,
};

const passwordWrapper = {
  position: "relative" as const,
  marginBottom: 8,
};

const passwordInput = {
  width: "100%",
  padding: "6px 32px 6px 6px",
  border: "1px solid #d1d5db",
  borderRadius: 4,
};

const eyeIcon = {
  position: "absolute" as const,
  right: 8,
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  userSelect: "none" as const,
  fontSize: 16,
};

const button = {
  marginTop: 8,
  padding: "6px 12px",
  width: "100%",
};

const switchText = {
  marginTop: 12,
  fontSize: 13,
};

const link = {
  color: "#2563eb",
  cursor: "pointer",
  fontWeight: 600,
};
