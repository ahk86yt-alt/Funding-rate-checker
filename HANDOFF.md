# funding-app handoff

## 現在のゴール
- 資金調達率の一覧テーブルは復旧済み
- /api/funding/all が { symbols, funding, errors } を返す

## 直した点（重要）
- app/api/funding/all/route.ts を「lib の fetcher を直接呼ぶ方式」に戻した
- Next dev の挙動が変な時は rm -rf .next → npm run dev で復旧

## 期待するAPIレスポンス
GET /api/funding/all
- symbols: string[]
- funding: { binance|okx|bybit|kucoin|mexc|gate|bitget: Record<symbol, rate(%)> }
- errors: 失敗した取引所のみ入る

## 次にやりたいこと
- アラート機能の作り込み（UI/DB/通知）
- しきい値のUX（「-1.6 → -1で通知」等の分かりやすい設定）
- グラフは一旦後回し
