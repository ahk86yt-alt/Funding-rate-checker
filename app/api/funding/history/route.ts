import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Point = { ts: number; rate: number };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const exchange = (searchParams.get("exchange") || "").toLowerCase();
    const symbol = (searchParams.get("symbol") || "").toUpperCase();
    const limit = Math.min(Number(searchParams.get("limit") || 48), 500);

    if (!exchange || !symbol) {
      return NextResponse.json(
        { error: "exchange and symbol are required" },
        { status: 400 }
      );
    }

    // まずは Binance のみ対応（他は後で拡張）
    if (exchange !== "binance") {
      return NextResponse.json(
        { error: `history not implemented for exchange=${exchange}` },
        { status: 501 }
      );
    }

    // Binance USDT perpetual funding history
    // docs: /fapi/v1/fundingRate
    const url = new URL("https://fapi.binance.com/fapi/v1/fundingRate");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Binance API error (${res.status})`, detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const json = await res.json();

    // Binance returns array [{ fundingRate, fundingTime, ... }]
    const points: Point[] = Array.isArray(json)
      ? json
          .map((r: any) => ({
            ts: Number(r.fundingTime),
            rate: Number(r.fundingRate) * 100, // %に合わせる（あなたのUIと同じ）
          }))
          .filter((p: Point) => Number.isFinite(p.ts) && Number.isFinite(p.rate))
          .sort((a, b) => a.ts - b.ts)
      : [];

    return NextResponse.json({ exchange, symbol, points });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal Server Error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
