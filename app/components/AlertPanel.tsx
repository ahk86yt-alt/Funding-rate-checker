"use client";

import { useEffect, useState } from "react";

type Alert = {
  id: string;
  exchange: string;
  symbol: string;
  direction: "above" | "below";
  threshold: number;
  enabled: boolean;
};

type Props = {
  userId: string; // AuthBox などから渡す
};

export default function AlertPanel({ userId }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [exchange, setExchange] = useState("binance");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState<number>(0);

  async function fetchAlerts() {
    const res = await fetch(`/api/alerts?userId=${userId}`);
    const data = await res.json();
    setAlerts(data);
  }

  async function createAlert() {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        exchange,
        symbol,
        direction,
        threshold,
      }),
    });
    await fetchAlerts();
  }

  async function toggleAlert(id: string, enabled: boolean) {
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    await fetchAlerts();
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div style={box}>
      <h3>アラート作成</h3>

      <div style={row}>
        <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
          <option value="binance">Binance</option>
          <option value="bitget">Bitget</option>
          <option value="mexc">MEXC</option>
        </select>

        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="BTCUSDT"
        />
      </div>

      <div style={row}>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as any)}
        >
          <option value="above">以上</option>
          <option value="below">以下</option>
        </select>

        <input
          type="number"
          step="0.0001"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
        />
      </div>

      <button onClick={createAlert}>追加</button>

      <hr />

      <h4>アラート一覧</h4>

      {alerts.map((a) => (
        <div key={a.id} style={alertRow}>
          <span>
            {a.exchange} / {a.symbol} / {a.direction} {a.threshold}
          </span>
          <button onClick={() => toggleAlert(a.id, a.enabled)}>
            {a.enabled ? "ON" : "OFF"}
          </button>
        </div>
      ))}
    </div>
  );
}

const box = {
  padding: 16,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  marginTop: 24,
};

const row = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
};

const alertRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 6,
};
