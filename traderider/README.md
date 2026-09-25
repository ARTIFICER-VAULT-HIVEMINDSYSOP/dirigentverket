# Traderider

A paper trading desk. The rider is a train on railroad tracks laid over NVIDIA candles. Upper Bollinger band is the long rail, lower band is the short rail, and the 20-period SMA is the flat rail.

This folder is its own app. It does not replace the Magasin or the ROBOT rider in the parent repo.

## Spec

- Ride Yahoo Finance NVDA candles (`interval=1h`, `range=1mo`). `GET /api/nvda` loads them. If Yahoo fails, the desk uses `src/data/nvda-fallback.json` and shows **Fallback data — Yahoo unavailable**.
- Bollinger bands: period 20, k = 2 (population standard deviation). The canvas keeps at least 108px between the upper and lower rails.
- The rider is a locomotive on ties and two rails. It starts **FLAT** on the mid rail.
- **BUY** opens a long and the train takes the upper rail. **SELL** opens a short and the train takes the lower rail. **FLAT** closes. An opposite order closes the open position and stops. It does not flip long to short, or short to long, in one action.
- Leverage is 1×–4×. It scales train speed and day-trade buying power together. 10× is clamped to 4×.
- Paper book starts at **$100,000**. Whole shares only. Buys fill at the offer plus one cent of slippage. Sells fill at the bid minus that slippage. Fills never use the mid. Bid and offer are the candle close ± a half-spread of 1.5 bps (minimum one cent). That spread is a desk rule, not a claimed NBBO feed. Equity is marked at the candle close.
- Maintenance is 25% of long market value and 30% of short market value. If equity is below the requirement, the local book is liquidated at the closing touch plus slippage. A full-size 4× long sits on the 25% line, so the spread can liquidate it on entry.
- Optional Alpaca broker. Keys are typed into the page and stored in **sessionStorage only**. They are not written to localStorage and are not logged. The browser calls `POST /api/broker`, which proxies Alpaca. Paper (`https://paper-api.alpaca.markets`) is the default. Live (`https://api.alpaca.markets`) requires an on-screen acknowledgement before keys can be saved or orders sent. Orders are NVDA market orders only. **Reset clears the local paper book and does not flatten a live broker position.** Automatic maintenance liquidation is local only.

## Controls

| Action | Keys | Button |
| --- | --- | --- |
| Buy / long | W, Arrow Up | Buy |
| Sell / short | S, Arrow Down | Sell |
| Flatten | F | Flat |
| Leverage down / up | `[` `]` | Lev − / Lev + |
| Pause | Space | Pause |

`window.__controlsTest` is installed while the desk is mounted. QA can read `getTrainY()`, `getSpeed()`, `getSide()`, and call `buy()`, `sell()`, `flatten()`, `setLeverage(n)`, and `step(ms)`. Buy lowers Y. Sell from flat raises Y. 4× moves four times faster than 1×.

## Run

Node 20 or newer.

```bash
cd traderider
npm install
npm run dev
```

Open http://localhost:3017

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build from `.output/server/index.mjs` (Nitro). It listens on port 3000 unless `PORT` is set. The dev server uses port **3017**.

Do not commit API keys, `.env` files, or customer data. This repository is public. Broker credentials belong in the browser tab only.
