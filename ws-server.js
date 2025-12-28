import WebSocket from "ws";

/**
 * 最新の Funding Rate を保持
 * （あとで Next.js から読む用）
 */
export const latestRates = {
  bitget: null,
  mexc: null,
};

/* =========================
   Bitget WebSocket
========================= */
function connectBitget() {
  const ws = new WebSocket("wss://ws.bitget.com/mix/v1/stream");

  ws.on("open", () => {
    console.log("[Bitget] connected");

    ws.send(
      JSON.stringify({
        op: "subscribe",
        args: [
          {
            instType: "UMCBL",
            channel: "funding-rate",
            instId: "BTCUSDT",
          },
        ],
      })
    );
  });

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      const rate = data?.data?.[0]?.fundingRate;

      if (rate) {
        latestRates.bitget = rate;
        console.log("[Bitget] funding rate:", rate);
      }
    } catch (e) {
      console.log("[Bitget] parse error", e);
    }
  });

  ws.on("close", () => {
    console.log("[Bitget] closed, reconnecting...");
    setTimeout(connectBitget, 3000);
  });

  ws.on("error", (err) => {
    console.log("[Bitget] error", err);
  });
}

/* =========================
   MEXC WebSocket
========================= */
function connectMexc() {
  const ws = new WebSocket("wss://contract.mexc.com/ws");

  ws.on("open", () => {
    console.log("[MEXC] connected");

    ws.send(
      JSON.stringify({
        method: "sub.funding.rate",
        param: {
          symbol: "BTC_USDT",
        },
      })
    );
  });

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      const rate = data?.data?.fundingRate;

      if (rate) {
        latestRates.mexc = rate;
        console.log("[MEXC] funding rate:", rate);
      }
    } catch (e) {
      console.log("[MEXC] parse error", e);
    }
  });

  ws.on("close", () => {
    console.log("[MEXC] closed, reconnecting...");
    setTimeout(connectMexc, 3000);
  });

  ws.on("error", (err) => {
    console.log("[MEXC] error", err);
  });
}

/* =========================
   起動
========================= */
connectBitget();
connectMexc();

console.log("WebSocket servers running...");
