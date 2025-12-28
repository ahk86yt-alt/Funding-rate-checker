export function normalizeSymbol(raw: string): string | null {
  if (!raw) return null;

  let symbol = raw.toUpperCase();

  // 区切り・派生語除去
  symbol = symbol
    .replace(/[-_/]/g, '')
    .replace('PERP', '')
    .replace('SWAP', '');

  // KuCoin: XBT → BTC
  if (symbol.startsWith('XBT')) {
    symbol = symbol.replace('XBT', 'BTC');
  }

  // KuCoin Futures: USDTM → USDT
  if (symbol.endsWith('USDTM')) {
    symbol = symbol.replace('USDTM', 'USDT');
  }

  if (!symbol.endsWith('USDT')) return null;

  const base = symbol.replace('USDT', '');
  if (base.length < 2) return null;

  return `${base}USDT`;
}
