/**
 * Binance USDT無期限先物の取引可能シンボル一覧を取得
 */
export async function fetchBinanceFuturesSymbols(): Promise<string[]> {
  const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
  if (!res.ok) {
    throw new Error('Failed to fetch Binance exchangeInfo');
  }

  const json = await res.json();

  return json.symbols
    .filter(
      (s: any) =>
        s.contractType === 'PERPETUAL' &&
        s.quoteAsset === 'USDT' &&
        s.status === 'TRADING'
    )
    .map((s: any) => s.symbol);
}
