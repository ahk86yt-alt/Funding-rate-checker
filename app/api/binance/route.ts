export async function GET() {
  try {
    // Binance（USDT無期限）
    const res = await fetch(
      "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT",
      { cache: "no-store" }
    );
    const json = await res.json();

    const rate = json?.lastFundingRate ?? null;
    return Response.json({ rate });
  } catch (e) {
    console.error("Binance error:", e);
    return Response.json({ rate: null });
  }
}
