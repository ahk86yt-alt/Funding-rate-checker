'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Exchange =
  | 'binance'
  | 'okx'
  | 'bybit'
  | 'kucoin'
  | 'mexc'
  | 'gate'
  | 'bitget';

type Point = { t: number; v: number };

type HistoryRes = {
  exchange: string;
  symbol: string;
  days: number;
  points: Point[];
  latest: number | null;
  updatedAt: string | null;
  warning?: string;
  error?: string;
};

type FundingAllRes = {
  symbols: string[];
  funding: Record<Exchange, Record<string, number>>;
  errors?: Record<string, string>;
};

function fmtRate(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return '-';
  return `${v.toFixed(4)}%`;
}

function fmtJP(isoOrMs: string | number | null | undefined) {
  if (isoOrMs == null) return '-';
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function RateChart({
  exchange,
  symbol,
}: {
  exchange: Exchange;
  symbol: string;
}) {
  const ex = String(exchange).toLowerCase() as Exchange;
  const sym = String(symbol).toUpperCase();

  const [days, setDays] = useState<1 | 7 | 14 | 30>(1);

  // history raw（DB）
  const [historyPoints, setHistoryPoints] = useState<Point[]>([]);

  // current（一覧と同じ /api/funding/all）
  const [latest, setLatest] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [status, setStatus] = useState<string>('');

  // hover/touch state（描画に使う points から選ぶ）
  const [hover, setHover] = useState<{
    on: boolean;
    x: number;
    y: number;
    p: Point | null;
  }>({ on: false, x: 0, y: 0, p: null });

  const pollingRef = useRef<number | null>(null);

  async function loadHistory(nextDays: 1 | 7 | 14 | 30) {
    try {
      const res = await fetch(
        `/api/funding/history?exchange=${encodeURIComponent(ex)}&symbol=${encodeURIComponent(sym)}&days=${nextDays}`,
        { cache: 'no-store' }
      );

      const json = (await res.json().catch(() => null)) as HistoryRes | null;

      if (!res.ok || !json) {
        setHistoryPoints([]);
        setStatus(json?.warning || json?.error || `履歴の取得に失敗しました（${res.status}）`);
        return;
      }

      const pts = Array.isArray(json.points) ? json.points : [];
      const clean = pts
        .filter((p) => typeof p?.t === 'number' && typeof p?.v === 'number')
        .sort((a, b) => a.t - b.t);

      setHistoryPoints(clean);

      if (json.warning) setStatus(json.warning);
    } catch (e: any) {
      setHistoryPoints([]);
      setStatus(e?.message ?? '履歴の取得に失敗しました');
    }
  }

  async function loadCurrentFromAll() {
    try {
      const res = await fetch('/api/funding/all', { cache: 'no-store' });
      const json = (await res.json().catch(() => null)) as FundingAllRes | null;

      if (!res.ok || !json) {
        setStatus(`現在値の取得に失敗しました（${res.status}）`);
        return;
      }

      const v = json?.funding?.[ex]?.[sym];
      if (!Number.isFinite(v)) {
        setStatus('現在の資金調達率が見つかりませんでした（一覧データ）');
        setLatest(null);
        setUpdatedAt(new Date().toISOString());
        return;
      }

      setLatest(v);
      // /api/funding/all は時刻を返さないので取得時刻を表示
      setUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      setStatus(e?.message ?? '現在値の取得に失敗しました');
    }
  }

  async function refreshAll(nextDays: 1 | 7 | 14 | 30) {
    await Promise.all([loadHistory(nextDays), loadCurrentFromAll()]);
  }

  useEffect(() => {
    setStatus('');
    refreshAll(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, ex, sym]);

  // 10秒ごとに更新（現在値・履歴）
  useEffect(() => {
    pollingRef.current = window.setInterval(() => {
      refreshAll(days);
    }, 10_000);

    const onVis = () => {
      if (document.visibilityState === 'visible') refreshAll(days);
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, ex, sym]);

  // ===== 履歴スケール自動補正（×100 / ÷100 っぽいときだけ） =====
  const normalizedHistoryPoints = useMemo(() => {
    if (!historyPoints.length) return historyPoints;
    if (latest == null || !Number.isFinite(latest)) return historyPoints;

    const last = historyPoints[historyPoints.length - 1]?.v;
    if (!Number.isFinite(last) || last === 0) return historyPoints;

    const r = Math.abs(latest) / Math.abs(last);

    // だいたい 100倍っぽい
    if (r > 80 && r < 120) {
      return historyPoints.map((p) => ({ ...p, v: p.v * r }));
    }

    // だいたい 1/100倍っぽい
    if (r > 0.008 && r < 0.012) {
      return historyPoints.map((p) => ({ ...p, v: p.v * r }));
    }

    return historyPoints;
  }, [historyPoints, latest]);

  // ===== 描画に使う points（履歴 + 現在値を右端に追加/置換） =====
  const points = useMemo(() => {
    const h = normalizedHistoryPoints;
    if (!h.length) return h;
    if (latest == null || !Number.isFinite(latest)) return h;

    const now = Date.now();
    const last = h[h.length - 1];
    const dt = now - last.t;

    // 最終記録が最近なら、最後の値を現在値に置き換える（終点一致）
    if (dt < 30_000) {
      return [...h.slice(0, -1), { t: last.t, v: latest }];
    }

    // 記録が古いなら、現在値を“今の点”として追加（終点一致）
    return [...h, { t: now, v: latest }];
  }, [normalizedHistoryPoints, latest]);

  // ===== SVG geometry =====
  const W = 900;
  const H = 260;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 40;

  const hasPoint = points.length >= 1;
  const hasLine = points.length >= 2;

  const geom = useMemo(() => {
    if (!hasPoint) {
      return {
        xmin: 0,
        xmax: 1,
        ymin: -0.01,
        ymax: 0.01,
        polyline: '',
        lastX: 0,
        lastY: 0,
        X: (t: number) => padL,
        Y: (v: number) => padT,
      };
    }

    const xs = points.map((p) => p.t);
    const ys = points.map((p) => p.v);
    const xmin = Math.min(...xs);
    const xmax = Math.max(...xs);

    let ymin = Math.min(...ys);
    let ymax = Math.max(...ys);

    // 0ラインが見えるように 0 を範囲に含める
    ymin = Math.min(ymin, 0);
    ymax = Math.max(ymax, 0);

    if (ymin === ymax) {
      ymin -= 0.01;
      ymax += 0.01;
    } else {
      const pad = (ymax - ymin) * 0.08;
      ymin -= pad;
      ymax += pad;
    }

    const X = (t: number) => {
      const denom = xmax - xmin;
      if (!denom) return padL + (W - padL - padR) / 2;
      return padL + ((t - xmin) / denom) * (W - padL - padR);
    };

    const Y = (v: number) => padT + (1 - (v - ymin) / (ymax - ymin)) * (H - padT - padB);

    const polyline = points
      .map((p) => `${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`)
      .join(' ');

    const last = points[points.length - 1];
    const lastX = X(last.t);
    const lastY = Y(last.v);

    return { xmin, xmax, ymin, ymax, polyline, lastX, lastY, X, Y };
  }, [hasPoint, points]);

  const zeroY = useMemo(() => {
    if (!hasPoint) return null;
    if (0 < geom.ymin || 0 > geom.ymax) return null;
    return geom.Y(0);
  }, [hasPoint, geom]);

  function nearestPointBySvgX(svgX: number): Point | null {
    if (!hasPoint) return null;

    const denomPx = (W - padL - padR) || 1;
    const ratio = clamp((svgX - padL) / denomPx, 0, 1);
    const targetT = geom.xmin + ratio * (geom.xmax - geom.xmin);

    let best: Point | null = null;
    let bestD = Infinity;
    for (const p of points) {
      const d = Math.abs(p.t - targetT);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  function setHoverFromClientXY(svgEl: SVGSVGElement, clientX: number, clientY: number) {
    const rect = svgEl.getBoundingClientRect();
    const rx = clientX - rect.left;
    const sx = (rx / rect.width) * W;

    const p = nearestPointBySvgX(sx);
    if (!p) {
      setHover({ on: false, x: 0, y: 0, p: null });
      return;
    }

    const x = geom.X(p.t);
    const y = geom.Y(p.v);
    void clientY;

    setHover({ on: true, x, y, p });
  }

  const xTicks = useMemo(() => {
    if (!hasPoint) return [];
    const n = 4;
    const out: { x: number; label: string }[] = [];
    for (let i = 0; i <= n; i++) {
      const tt = geom.xmin + ((geom.xmax - geom.xmin) * i) / n;
      const x = geom.X(tt);

      const d = new Date(tt);
      const label =
        days <= 1
          ? d.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit' });

      out.push({ x, label });
    }
    return out;
  }, [hasPoint, geom, days]);

  const yTicks = useMemo(() => {
    if (!hasPoint) return [];
    const ks = [0, 0.5, 1];
    return ks.map((k) => {
      const y = padT + k * (H - padT - padB);
      const v = geom.ymax - k * (geom.ymax - geom.ymin);
      return { y, label: `${v.toFixed(4)}%` };
    });
  }, [hasPoint, geom]);

  const periodBtn = (label: string, v: 1 | 7 | 14 | 30) => (
    <button
      type="button"
      onClick={() => setDays(v)}
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid #d1d5db',
        background: days === v ? '#111827' : '#fff',
        color: days === v ? '#fff' : '#111827',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>資金調達率グラフ</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {ex.toUpperCase()} / {sym}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>現在の資金調達率（一覧と同じ）</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{fmtRate(latest)}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            最終更新：{fmtJP(updatedAt)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {periodBtn('直近1日', 1)}
        {periodBtn('直近7日', 7)}
        {periodBtn('直近14日', 14)}
        {periodBtn('直近30日', 30)}

        <button
          type="button"
          onClick={() => {
            setStatus('');
            refreshAll(days);
          }}
          style={{
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          再読み込み
        </button>

        <span style={{ fontSize: 12, color: '#6b7280' }}>データ点数：{points.length}</span>
        {status ? <span style={{ fontSize: 12, color: '#ef4444' }}>{status}</span> : null}
      </div>

      <div style={{ marginTop: 10, position: 'relative', touchAction: 'none' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: 'block', background: '#fff', borderRadius: 10, border: '1px solid #f3f4f6' }}
          onMouseLeave={() => setHover({ on: false, x: 0, y: 0, p: null })}
          onMouseMove={(e) => setHoverFromClientXY(e.currentTarget, e.clientX, e.clientY)}
          onTouchStart={(e) => {
            const t = e.touches?.[0];
            if (!t) return;
            setHoverFromClientXY(e.currentTarget, t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches?.[0];
            if (!t) return;
            setHoverFromClientXY(e.currentTarget, t.clientX, t.clientY);
          }}
          onTouchEnd={() => setHover({ on: false, x: 0, y: 0, p: null })}
          onTouchCancel={() => setHover({ on: false, x: 0, y: 0, p: null })}
        >
          {/* grid */}
          {yTicks.map((t, idx) => (
            <line
              key={idx}
              x1={padL}
              x2={W - padR}
              y1={t.y}
              y2={t.y}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* 0% line */}
          {zeroY != null ? (
            <>
              <line
                x1={padL}
                x2={W - padR}
                y1={zeroY}
                y2={zeroY}
                stroke="#111827"
                strokeWidth="1.5"
                strokeOpacity="0.35"
              />
              <text x={8} y={zeroY + 4} fontSize="12" fill="#111827" opacity="0.55">
                0.0000%
              </text>
            </>
          ) : null}

          {/* y labels */}
          {hasPoint
            ? yTicks.map((t, idx) => (
                <text key={idx} x={8} y={t.y + 4} fontSize="12" fill="#6b7280">
                  {t.label}
                </text>
              ))
            : null}

          {/* x axis baseline */}
          <line
            x1={padL}
            x2={W - padR}
            y1={H - padB}
            y2={H - padB}
            stroke="#f3f4f6"
            strokeWidth="1"
          />

          {/* x labels */}
          {hasPoint
            ? xTicks.map((t, idx) => (
                <g key={idx}>
                  <line
                    x1={t.x}
                    x2={t.x}
                    y1={H - padB}
                    y2={H - padB + 6}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text x={t.x} y={H - 14} fontSize="12" fill="#6b7280" textAnchor="middle">
                    {t.label}
                  </text>
                </g>
              ))
            : null}

          {/* series */}
          {hasPoint ? (
            <>
              {hasLine ? <polyline fill="none" stroke="#111827" strokeWidth="2" points={geom.polyline} /> : null}
              <circle cx={geom.lastX} cy={geom.lastY} r={3.5} fill="#111827" />
            </>
          ) : (
            <text x={padL} y={padT + 20} fontSize="12" fill="#6b7280">
              履歴がありません
            </text>
          )}

          {/* hover/touch tooltip */}
          {hover.on && hover.p ? (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={padT}
                y2={H - padB}
                stroke="#111827"
                strokeWidth="1"
                strokeOpacity="0.25"
              />
              <circle cx={hover.x} cy={hover.y} r={4} fill="#111827" />

              {(() => {
                const tipW = 230;
                const tipH = 52;
                const x = clamp(hover.x + 10, padL, W - padR - tipW);
                const y = clamp(hover.y - tipH - 10, padT, H - padB - tipH);

                return (
                  <g>
                    <rect x={x} y={y} width={tipW} height={tipH} rx={10} fill="#111827" opacity="0.92" />
                    <text x={x + 12} y={y + 20} fontSize="12" fill="#ffffff">
                      時刻：{fmtJP(hover.p.t)}
                    </text>
                    <text x={x + 12} y={y + 40} fontSize="12" fill="#ffffff">
                      資金調達率：{fmtRate(hover.p.v)}
                    </text>
                  </g>
                );
              })()}
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
