export async function GET() {
  try {
    const res = await fetch(
      "https://contract.mexc.com/api/v1/contract/funding_rate/BTC_USDT",
      { cache: "no-store" }
    );

    const json = await res.json();

    return Response.json({
      rate: json?.data?.fundingRate ?? null,
    });
  } catch (e) {
    console.error("MEXC Error:", e);
    return Response.json({ rate: null });
  }
}