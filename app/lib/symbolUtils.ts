export function extractBaseSymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.replace(/USDT|USD|USDC$/i, '');
}
