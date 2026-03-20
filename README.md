# ⬡ ChainScope — Ethereum Blockchain Explorer

<div align="center">

![ChainScope](https://img.shields.io/badge/ChainScope-Ethereum%20Explorer-0784c3?style=for-the-badge&logo=ethereum&logoColor=white)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white)

**A full-featured, Etherscan-inspired blockchain explorer — running entirely in your browser with zero backend required.**

[Features](#-features) · [Pages](#-pages) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Connecting a Real Backend](#-connecting-a-real-backend)

</div>

---

## ✨ Overview

**ChainScope** is a pixel-perfect, fully client-side Ethereum blockchain explorer modelled after Etherscan. It simulates an entire Ethereum-style chain in memory — blocks, transactions, balances, gas prices — and renders live updates every few seconds, just like the real thing.

It fetches **real ETH prices** from the CoinGecko API and smoothly ticks between fetches, so the experience always feels live.

> **Built for:** Demos, hackathons, portfolio projects, and as a drop-in template for connecting a real Ethereum node.

---

## 🚀 Features

| Feature | Details |
|---|---|
| 🔴 **Live feed** | New blocks minted every ~5 seconds with full transaction lists |
| 💰 **Real ETH price** | Fetched from CoinGecko every 60s with smooth ±0.01% price drift |
| ⛽ **Gas Tracker** | Live Slow / Average / Fast / Instant gas prices in Gwei + USD cost |
| 🔍 **Universal Search** | Search by block number, block hash, transaction hash, or wallet address |
| 📊 **Analytics Charts** | TX volume bar chart, network hashrate sparkline, gas price history line chart |
| 📋 **Detail Modals** | Click any block or transaction to see a full Etherscan-style detail panel |
| 👛 **Address Lookup** | Balance, USD value, and full transaction history for any known address |
| ⬇️ **Data Export** | Download transaction data as **CSV** or **JSON** |
| 🌗 **3 Themes** | Day ☀️ / Night 🌙 / Dim 🌒 — persisted to `localStorage` |
| 📱 **Responsive** | Works on desktop and mobile screens |

---

## 📄 Pages

### 🏠 Home
- **Stats bar** — ETH price + 24h change, market cap, transaction count, gas price, finalized block, 14-day sparkline (mirrors Etherscan's dark bar)
- **Latest Blocks** panel (8 most recent, updates live)
- **Latest Transactions** panel (8 most recent, updates live)

### ⛓️ Blockchain (Blocks)
- Paginated table of up to 60 latest blocks
- Columns: Block #, Age, Txn count, Fee Recipient, Gas Used (with mini progress bar), Gas Limit, Base Fee, Reward

### 💸 Tokens (Transactions)
- Paginated table of up to 120 latest transactions
- Columns: Txn Hash, Method badge, Block, Age, From → To, Value, Fee
- CSV and JSON export buttons

### 📈 Analytics (Network)
- 9 live network stat cards: Latest Block, Total TXs, Hashrate, Difficulty, Avg Block Time, Peers, TPS, Pending TXs, Market Cap
- **Transaction Volume** bar chart — last 20 blocks
- **Network Hashrate** sparkline — rolling 20 points

### ⛽ Gas Tracker
- 4 gas tier cards: 🐢 Low · 🚗 Average · 🚀 High · ⚡ Instant (with USD transfer cost)
- **Gas Price History** multi-line chart — last 30 data points at 3s interval

### 🔎 Address Lookup
- Enter any `0x…` address to see ETH balance, USD value, and transaction history
- Quick-select chips for 8 known addresses

---

## 🏗️ Architecture

```
blockchain/
├── index.html       # Single-page app shell — all pages, navbar, modals, footer
├── styles.css       # Full design system — themes, layout, components (32 KB)
├── blockchain.js    # Mock blockchain engine — block/tx generation, in-memory chain
├── charts.js        # Chart.js visualization wrappers (gas, TX volume, hashrate)
└── app.js           # UI controller — rendering, search, navigation, real-time loop
```

### Data Flow

```
BlockchainEngine (blockchain.js)
    │
    ├─── init(50 blocks)  ──────────► In-memory chain + tx pool
    │
    ├─── mintBlock()  ─────────────► Called every 5s by app.js
    │
    ├─── fetchRealEthPrice()  ─────► CoinGecko API (every 60s)
    │
    └─── Public API ────────────────► app.js reads & renders
             getLatestBlocks()
             getLatestTxs()
             getBlockByNumber/Hash()
             getTxByHash()
             getAddressData()
             getNetworkStats()
             getGasHistory()
             searchAll()
```

### Key Design Decisions

- **Zero dependencies at runtime** beyond Chart.js (loaded from CDN). No Node.js, no build step.
- **IIFE modules** — `BlockchainEngine`, `Charts`, and the `App` controller are each wrapped in immediately-invoked function expressions to avoid global pollution.
- **CoinGecko integration** — Real price fetched on load and every 60 seconds, with a ±0.01% smooth drift every 1.5 seconds so the ticker always looks alive.
- **Address balance tracking** — Every simulated transaction debits/credits an in-memory `balanceMap`, so wallet balances are consistent across lookups.
- **Theme system** — CSS custom properties (`--bg`, `--text-dark`, `--blue`, etc.) are overridden per `data-theme` attribute on `<html>`, allowing instant, flicker-free switching.

---

## ⚡ Getting Started

ChainScope is a **zero-build, zero-install** project. Just open it in a browser:

```bash
# Option 1: Open directly
start index.html

# Option 2: Serve locally (recommended for CoinGecko API to work without CORS issues)
npx serve .
# or
python -m http.server 8080
```

Then visit `http://localhost:8080` in your browser.

> **Note:** Live ETH price requires an internet connection. If the CoinGecko fetch fails, ChainScope falls back to a sensible cached price silently.

---

## 🔌 Connecting a Real Backend

The entire simulated data layer lives in `blockchain.js`. To plug in a real Ethereum node (e.g. via Alchemy, Infura, or your own node):

1. **Replace `BlockchainEngine` methods** with `fetch()` calls to your RPC/REST API:

```js
// Before (simulated):
function getLatestBlocks(n) {
  return [...chain].reverse().slice(0, n);
}

// After (real backend):
async function getLatestBlocks(n) {
  const res = await fetch(`https://your-api.com/blocks?limit=${n}`);
  return res.json();
}
```

2. The `app.js` UI layer calls the same public API — **no changes needed in the UI**.

### Public API Surface

| Method | Returns |
|---|---|
| `getLatestBlocks(n)` | Array of the `n` most recent block objects |
| `getLatestTxs(n)` | Array of the `n` most recent transaction objects |
| `getBlockByNumber(num)` | Single block object or `null` |
| `getBlockByHash(hash)` | Single block object or `null` |
| `getTxByHash(hash)` | Single transaction object or `null` |
| `getAddressData(addr)` | `{ address, balance, txCount, txHistory }` |
| `getNetworkStats()` | ETH price, market cap, TPS, gas, peer count, etc. |
| `getGasHistory()` | Array of `{ slow, standard, fast, instant }` samples |
| `searchAll(query)` | `{ type: 'block'|'tx'|'address', data }` or `null` |

---

## 🎨 Theming

| Theme | Trigger |
|---|---|
| ☀️ Day | White background, dark text — great for readability |
| 🌙 Night | Deep dark background — easy on eyes |
| 🌒 Dim | Muted dark — softer contrast than Night |

Theme preference is saved to `localStorage` under the key `chainscope-theme`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic, ARIA-labelled) |
| Styles | Vanilla CSS with custom properties |
| Logic | Vanilla JavaScript (ES2020, no framework) |
| Charts | [Chart.js 4.4.2](https://www.chartjs.org/) via CDN |
| Price API | [CoinGecko Free API](https://www.coingecko.com/en/api) |
| Font | Inter (via system stack) |

---

## 📸 Screenshots

> Open `index.html` in your browser to see ChainScope live — blocks mint in real time, gas prices tick every 3 seconds, and the ETH price updates from CoinGecko automatically.

---

## 📝 License

This project is open-source and free to use for any purpose. No attribution required.

---

<div align="center">
  <strong>ChainScope</strong> · Built with ❤️ · Powered by simulated Ethereum data + real CoinGecko prices
</div>