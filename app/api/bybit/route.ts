export async function GET() {
  try {
    // Bybit（USDT無期限）
    const res = await fetch(
      "https://api.bybit.com/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=1",
      { cache: "no-store" }
    );
    const json = await res.json();

    const rate = json?.result?.list?.[0]?.fundingRate ?? null;
    return Response.json({ rate });
  } catch (e) {
    console.error("Bybit error:", e);
    return Response.json({ rate: null });
  }
}
