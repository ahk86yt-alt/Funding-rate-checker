'use client';

import { useMemo } from 'react';

type Point = { t: number; ratePct: number };

type Props = {
  points: Point[];               // 時系列（%）
  width?: number;                // default 640
  height?: number;               // default 180
  thresholdPct?: number | null;  // アラートしきい値（%）
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function FundingHistoryMiniGraph({
  points,
  width = 640,
  height = 180,
  thresholdPct = null,
}: Props) {
  const { polyline, areaPath, minV, maxV, yZero, yThreshold } = useMemo(() => {
    const p = (points || []).filter(
      (x) => Number.isFinite(x?.t) && Number.isFinite(x?.ratePct)
    );

    if (p.length < 2) {
      return { polyline: '', areaPath: '', minV: 0, maxV: 0, yZero: null as number | null, yThreshold: null as number | null };
    }

    const values = p.map((x) => x.ratePct);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const range = max - min;
    const pad = range === 0 ? Math.max(0.01, Math.abs(max) * 0.1) : range * 0.08;
    const minP = min - pad;
    const maxP = max + pad;
    const denom = maxP - minP || 1;

    const toX = (i: number) => (i / (p.length - 1)) * (width - 1);
    const toY = (v: number) => {
      const t = (v - minP) / denom;              // 0..1
      const y = (height - 1) - t * (height - 1); // inverted
      return clamp(y, 0, height - 1);
    };

    const pts = p.map((x, i) => `${toX(i).toFixed(2)},${toY(x.ratePct).toFixed(2)}`);
    const poly = pts.join(' ');

    const first = pts[0].split(',').map(Number);
    const last = pts[pts.length - 1].split(',').map(Number);

    const area =
      `M ${first[0]} ${first[1]} ` +
      p.map((x, i) => `L ${toX(i).toFixed(2)} ${toY(x.ratePct).toFixed(2)}`).join(' ') +
      ` L ${last[0]} ${(height - 1).toFixed(2)} L ${first[0]} ${(height - 1).toFixed(2)} Z`;

    const zeroLine = (minP <= 0 && 0 <= maxP) ? toY(0) : null;
    const thrLine =
      thresholdPct != null && Number.isFinite(thresholdPct) && (minP <= thresholdPct && thresholdPct <= maxP)
        ? toY(thresholdPct)
        : null;

    return { polyline: poly, areaPath: area, minV: min, maxV: max, yZero: zeroLine, yThreshold: thrLine };
  }, [points, width, height, thresholdPct]);

  if (!polyline) {
    return (
      <div style={{ width, height, border: '1px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        no history
      </div>
    );
  }

  // 色：全マイナス→赤 / 全プラス→緑 / 混在→青
  const allNeg = maxV < 0;
  const allPos = minV > 0;
  const stroke = allNeg ? '#ef4444' : allPos ? '#22c55e' : '#3b82f6';
  const fill = allNeg ? 'rgba(239,68,68,0.16)' : allPos ? 'rgba(34,197,94,0.16)' : 'rgba(59,130,246,0.16)';

  return (
    <div style={{ width }}>
      <div style={{ width, height, borderRadius: 12, border: '1px solid #e5e7eb', background: '#0b1220', overflow: 'hidden' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* 0ライン */}
          {yZero != null && (
            <line x1="0" y1={yZero} x2={width} y2={yZero} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 4" />
          )}

          {/* しきい値ライン */}
          {yThreshold != null && (
            <line x1="0" y1={yThreshold} x2={width} y2={yThreshold} stroke="rgba(250,204,21,0.85)" strokeWidth="1.5" />
          )}

          {/* 面 */}
          <path d={areaPath} fill={fill} />

          {/* 線 */}
          <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
