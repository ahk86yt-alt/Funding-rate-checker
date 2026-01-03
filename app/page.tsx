'use client';

import { useState } from 'react';
import FundingTable from './components/FundingTable';

export type SymbolSortMode = 'marketcap' | 'alpha';

export default function HomePage() {
  const [sortMode, setSortMode] = useState<SymbolSortMode>('marketcap');

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 0 }}>Funding Rates</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, color: '#374151', fontSize: 13 }}>並び替え</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SymbolSortMode)}
            style={{
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <option value="marketcap">時価総額順</option>
            <option value="alpha">アルファベット順</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <FundingTable sortMode={sortMode} />
      </div>
    </main>
  );
}
