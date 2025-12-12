export async function GET() {
  try {
    const res = await fetch(
      "https://api.bitget.com/api/mix/v1/market/history-fundRate?symbol=BTCUSDT_UMCBL"
    );
    const json = await res.json();

    return Response.json({
      rate: json.data?.[0]?.fundingRate ?? null
    });
  } catch (e) {
    return Response.json({ rate: null });
  }
}
