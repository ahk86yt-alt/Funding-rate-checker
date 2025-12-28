// Binance USDT無期限
export async function fetchBinanceSymbols(): Promise<Set<string>> {
  const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
  const json = await res.json();
  return new Set(
    json.symbols
      .filter(
        (s: any) =>
          s.contractType === 'PERPETUAL' &&
          s.quoteAsset === 'USDT' &&
          s.status === 'TRADING'
      )
      .map((s: any) => s.symbol)
  );
}

// Bitget（USDT無期限）
export async function fetchBitgetSymbols(): Promise<Set<string>> {
  const res = await fetch(
    'https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES'
  );
  const json = await res.json();
  return new Set(json.data.map((s: any) => s.symbol.replace('_', '')));
}

// MEXC（USDT無期限）
export async function fetchMexcSymbols(): Promise<Set<string>> {
  const res = await fetch('https://contract.mexc.com/api/v1/contract/detail');
  const json = await res.json();
  return new Set(
    json.data
      .filter((s: any) => s.quoteCoin === 'USDT')
      .map((s: any) => s.symbol)
  );
}
