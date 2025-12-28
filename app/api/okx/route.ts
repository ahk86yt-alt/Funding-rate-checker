export async function GET() {
  try {
    // OKX（USDT無期限）
    const res = await fetch(
      "https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP",
      { cache: "no-store" }
    );
    const json = await res.json();

    const rate = json?.data?.[0]?.fundingRate ?? null;
    return Response.json({ rate });
  } catch (e) {
    console.error("OKX error:", e);
    return Response.json({ rate: null });
  }
}
