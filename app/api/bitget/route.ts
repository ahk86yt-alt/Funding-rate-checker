export async function GET() {
  try {
    const res = await fetch(
      "https://api.bitget.com/api/v2/mix/market/current-fund-rate?symbol=BTCUSDT&productType=USDT-FUTURES",
      { cache: "no-store" }
    );

    const json = await res.json();

    const rate =
      Array.isArray(json?.data) && json.data.length > 0
        ? json.data[0].fundingRate
        : null;

    return Response.json({ rate });
  } catch (e) {
    console.error("Bitget error:", e);
    return Response.json({ rate: null });
  }
}
