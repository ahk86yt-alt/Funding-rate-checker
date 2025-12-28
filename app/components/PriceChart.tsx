"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type CandlestickData,
} from "lightweight-charts";

type Props = {
  data: CandlestickData[];
};

export default function PriceChart({ data }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // v4 正解
    const series = chart.addCandlestickSeries();

    series.applyOptions({
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderUpColor: "#ef4444",
      borderDownColor: "#22c55e",
      wickUpColor: "#ef4444",
      wickDownColor: "#22c55e",
    });

    series.setData(data);

    return () => {
      chart.remove();
    };
  }, [data]);

  return <div ref={ref} style={{ width: "100%" }} />;
}
