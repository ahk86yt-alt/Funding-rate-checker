import { NextResponse } from "next/server";
import {
  fetchBinanceFundingRates,
  fetchOkxFundingRates,
  fetchBybitFundingRates,
  fetchKucoinFundingRates,
  fetchMexcFundingRates,
  fetchGateFundingRates,
  fetchBitgetFundingRates,
} from "@/app/lib/fundingRate";

export const dynamic = "force-dynamic";

type Exchange =
  | "binance"
  | "okx"
  | "bybit"
  | "kucoin"
  | "mexc"
  | "gate"
  | "bitget";

type FundingMap = Record<string, number>;

async function safe(ex: Exchange, fn: () => Promise<FundingMap>) {
  try {
    const data = await fn();
    // data が { BTCUSDT: 0.01, ... } の形であることを期待
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { data: {} as FundingMap, error: `invalid response for ${ex}` };
    }
    return { data, error: null as string | null };
  } catch (e: any) {
    return { data: {} as FundingMap, error: e?.message ?? String(e) };
  }
}

export async function GET() {
  const [binance, okx, bybit, kucoin, mexc, gate, bitget] = await Promise.all([
    safe("binance", fetchBinanceFundingRates),
    safe("okx", fetchOkxFundingRates),
    safe("bybit", fetchBybitFundingRates),
    safe("kucoin", fetchKucoinFundingRates),
    safe("mexc", fetchMexcFundingRates),
    safe("gate", fetchGateFundingRates),
    safe("bitget", fetchBitgetFundingRates),
  ]);

  const funding: Record<Exchange, FundingMap> = {
    binance: binance.data,
    okx: okx.data,
    bybit: bybit.data,
    kucoin: kucoin.data,
    mexc: mexc.data,
    gate: gate.data,
    bitget: bitget.data,
  };

  const errors: Partial<Record<Exchange, string>> = {};
  if (binance.error) errors.binance = binance.error;
  if (okx.error) errors.okx = okx.error;
  if (bybit.error) errors.bybit = bybit.error;
  if (kucoin.error) errors.kucoin = kucoin.error;
  if (mexc.error) errors.mexc = mexc.error;
  if (gate.error) errors.gate = gate.error;
  if (bitget.error) errors.bitget = bitget.error;

  const symbols = Array.from(
    new Set(Object.values(funding).flatMap((m) => Object.keys(m ?? {})))
  ).sort();

  return NextResponse.json({ symbols, funding, errors });
}
