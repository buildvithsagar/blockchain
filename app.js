// ============================================================
// app.js — ChainScope UI Controller (Etherscan-Style Layout)
// ============================================================

(function () {
  'use strict';

  // ── Theme Manager ─────────────────────────────────────────
  (function ThemeManager() {
    const STORAGE_KEY = 'chainscope-theme';
    const THEMES = ['day', 'night', 'dim'];

    function applyTheme(theme) {
      if (!THEMES.includes(theme)) theme = 'day';
      // Set data-theme on <html> so CSS vars cascade everywhere
      document.documentElement.dataset.theme = theme === 'day' ? '' : theme;
      // Update active button state
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
      });
      // Persist
      localStorage.setItem(STORAGE_KEY, theme);
    }

    // Wire up buttons
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
      });
      // Restore saved theme (default: day)
      const saved = localStorage.getItem(STORAGE_KEY) || 'day';
      applyTheme(saved);
    });
  })();

  const $ = id => document.getElementById(id);

  // ── Format helpers ────────────────────────────────────────
  const F = {
    num: n => Number(n).toLocaleString(),
    eth: v => parseFloat(v).toFixed(4) + ' ETH',
    addr: a => a ? a.slice(0, 8) + '…' + a.slice(-6) : '—',
    hash: h => h ? h.slice(0, 12) + '…' + h.slice(-8) : '—',
    gwei: g => g + ' Gwei',
    pct: (u, l) => ((u / l) * 100).toFixed(1) + '%',
    bytes: b => b > 1024 ? (b / 1024).toFixed(1) + ' KB' : b + ' B',
    ts: s => new Date(s * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    usd: n => '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    fee: tx => ((tx.gasUsed * tx.gasPrice) / 1e9).toFixed(6),
    ago: s => {
      const d = Math.floor(Date.now() / 1000) - s;
      if (d < 60) return d + ' secs ago';
      if (d < 3600) return Math.floor(d / 60) + ' mins ago';
      if (d < 86400) return Math.floor(d / 3600) + ' hrs ago';
      return Math.floor(d / 86400) + ' days ago';
    },
  };

  // ── Badges ───────────────────────────────────────────────
  function bStatus(s) {
    return s === 'success'
      ? '<span class="badge b-success">✓ Success</span>'
      : '<span class="badge b-error">✗ Failed</span>';
  }
  function bMethod(t) {
    return `<span class="badge b-tag">${t}</span>`;
  }
  function bDirection(from, currentAddr) {
    if (!currentAddr) return '';
    return from === currentAddr
      ? '<span class="badge b-out">OUT</span>'
      : '<span class="badge b-in">IN</span>';
  }

  // ── Page Navigation ───────────────────────────────────────
  const navBtns = document.querySelectorAll('.nav-link[data-page]');
  const pages = document.querySelectorAll('.page');
  let currentPage = 'home';

  function goPage(name) {
    currentPage = name;
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.page === name));
    pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    onPageEnter(name);
  }

  function onPageEnter(name) {
    if (name === 'network') {
      setTimeout(() => {
        Charts.initTxVolChart('txVolChart');
        Charts.initHashrateChart('hashrateChart');
        refreshNetStats();
      }, 50);
    }
    if (name === 'gas') {
      setTimeout(() => {
        Charts.initGasChart('gasChart');
        refreshGasCards();
      }, 50);
    }
  }

  navBtns.forEach(b => b.addEventListener('click', () => goPage(b.dataset.page)));

  // ── Stats bar & nav price ─────────────────────────────────
  let sparkChart = null;

  function drawSparkline() {
    const canvas = $('sparkCanvas');
    if (!canvas) return;
    // Generate 14 days of simulated tx volume data
    const data = Array.from({ length: 14 }, (_, i) => {
      const base = 1400000 + Math.sin(i * 0.8) * 300000;
      return Math.round(base + (Math.random() - 0.5) * 200000);
    });
    const labels = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    if (sparkChart) { sparkChart.destroy(); }
    sparkChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: 'rgba(255,255,255,0.65)',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false }, tooltip: {
            callbacks: { label: ctx => (ctx.parsed.y / 1000).toFixed(0) + 'k txs' },
            titleFont: { size: 10 }, bodyFont: { size: 10 },
            displayColors: false,
          }
        },
        scales: {
          x: {
            display: true, grid: { display: false },
            ticks: {
              color: 'rgba(255,255,255,0.35)', font: { size: 9 },
              maxTicksLimit: 4, maxRotation: 0
            },
            border: { display: false },
          },
          y: { display: false }
        }
      }
    });
  }

  function refreshStatsBar() {
    const s = BlockchainEngine.getNetworkStats();
    const g = BlockchainEngine.getCurrentGas();
    const ep = s.ethPrice;

    // ETH price with simulated BTC pair
    const btcPrice = (ep / 102000).toFixed(6);
    const change = s.ethChange ?? -3.7;

    // Flash navbar badge green/red on price change
    const priceWrap = $('nav-price-wrap');
    const prevPrice = parseFloat(priceWrap?.dataset.prev || ep);
    if (priceWrap && ep !== prevPrice) {
      const cls = ep > prevPrice ? 'flash-up' : 'flash-down';
      priceWrap.classList.remove('flash-up', 'flash-down');
      priceWrap.classList.add(cls);
      setTimeout(() => priceWrap.classList.remove(cls), 800);
      priceWrap.dataset.prev = ep;
    }
    if ($('nav-price')) $('nav-price').textContent = F.usd(ep);
    if ($('s-price')) $('s-price').textContent = F.usd(ep);
    if ($('s-btc')) $('s-btc').textContent = btcPrice;
    if ($('s-change')) {
      const el = $('s-change');
      el.textContent = '(' + (change > 0 ? '+' : '') + change + '%)';
      el.className = change >= 0 ? 'price-up' : 'price-down';
    }

    // Market cap
    if ($('s-mcap')) $('s-mcap').textContent = s.marketCap;

    // Transactions + TPS
    const txM = (s.totalTxs / 1_000_000).toFixed(2);
    if ($('s-txs')) $('s-txs').textContent = txM + ' M';
    if ($('s-tps')) $('s-tps').textContent = s.tps;

    // Gas in Gwei + USD (teal)
    if ($('s-gas')) $('s-gas').textContent = g.standard + ' Gwei';
    if ($('s-gas-usd')) {
      const gasUsd = ((g.standard * 21000 * 1e-9) * ep).toFixed(2);
      $('s-gas-usd').textContent = gasUsd;
    }

    // Last finalized + safe block (Etherscan shows separate finalized vs safe)
    if ($('s-finalized')) $('s-finalized').textContent = s.latestBlock;
    if ($('s-safe')) $('s-safe').textContent = s.latestBlock + 2;

    // Legacy IDs used in other pages
    if ($('strip-block')) $('strip-block').textContent = '#' + F.num(s.latestBlock);
    if ($('strip-txs')) $('strip-txs').textContent = F.num(s.totalTxs);
    if ($('strip-gas')) $('strip-gas').textContent = g.standard;
    if ($('strip-tps')) $('strip-tps').textContent = s.tps;
    if ($('strip-pending')) $('strip-pending').textContent = F.num(s.pendingTxs);
    if ($('strip-peers')) $('strip-peers').textContent = s.peers;
    if ($('strip-hashrate')) $('strip-hashrate').textContent = s.hashrate;
  }


  // ── Home: dual-column lists ───────────────────────────────
  function renderHomeLists() {
    const blocks = BlockchainEngine.getLatestBlocks(8);
    $('home-blocks-tb').innerHTML = blocks.map(b => `
      <tr onclick="App.openBlock(${b.number})">
        <td>
          <div class="tx-icon">Bk</div>
        </td>
        <td>
          <div><a class="hash-link" onclick="event.stopPropagation();App.openBlock(${b.number})">${F.num(b.number)}</a></div>
          <div class="age-cell">${F.ago(b.timestamp)}</div>
        </td>
        <td>
          <div style="font-size:.78rem;color:var(--text-muted)">Fee Recipient</div>
          <div><a class="addr-link" onclick="event.stopPropagation();App.openAddress('${b.miner}')">${F.addr(b.miner)}</a></div>
        </td>
        <td>
          <span style="font-size:.8rem">${F.num(b.txCount)} txns</span>
          <span style="font-size:.78rem;color:var(--text-muted);margin-left:4px">in ${b.reward.toFixed(4)} ETH</span>
        </td>
      </tr>`).join('');

    const txs = BlockchainEngine.getLatestTxs(8);
    $('home-txs-tb').innerHTML = txs.map(tx => `
      <tr onclick="App.openTx('${tx.hash}')">
        <td>
          <div class="tx-icon">Tx</div>
        </td>
        <td>
          <div><a class="hash-link">${F.hash(tx.hash)}</a></div>
          <div class="age-cell">${F.ago(tx.timestamp)}</div>
        </td>
        <td>
          <div style="font-size:.78rem"><span style="color:var(--text-muted)">From</span> <a class="addr-link" onclick="event.stopPropagation();App.openAddress('${tx.from}')">${F.addr(tx.from)}</a></div>
          <div style="font-size:.78rem"><span style="color:var(--text-muted)">To</span>&nbsp;&nbsp;&nbsp;<a class="addr-link" onclick="event.stopPropagation();App.openAddress('${tx.to}')">${F.addr(tx.to)}</a></div>
        </td>
        <td style="text-align:right">
          <div style="font-size:.8rem;font-weight:500">${F.eth(tx.value)}</div>
          <div class="age-cell" style="font-size:.73rem">${F.fee(tx)} ETH fee</div>
        </td>
      </tr>`).join('');
  }

  // ── Blocks page ───────────────────────────────────────────
  let bPage = 1; const BPER = 15;
  function renderBlocks() {
    const all = BlockchainEngine.getLatestBlocks(60);
    $('blk-count').textContent = F.num(all.length);
    const pg = all.slice((bPage - 1) * BPER, bPage * BPER);
    $('blocks-tb').innerHTML = pg.map(b => `
      <tr onclick="App.openBlock(${b.number})">
        <td><a class="hash-link" onclick="event.stopPropagation();App.openBlock(${b.number})">${F.num(b.number)}</a></td>
        <td class="age-cell">${F.ago(b.timestamp)}</td>
        <td><a class="hash-link" onclick="event.stopPropagation();App.goPage('transactions')">${F.num(b.txCount)}</a></td>
        <td><a class="addr-link" onclick="event.stopPropagation();App.openAddress('${b.miner}')">${F.addr(b.miner)}</a></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="background:#e9ecef;border-radius:99px;height:5px;flex:1;max-width:80px;overflow:hidden">
              <div style="width:${F.pct(b.gasUsed, b.gasLimit)};background:${parseFloat(F.pct(b.gasUsed, b.gasLimit)) > 80 ? '#dc3545' : '#0784c3'};height:100%"></div>
            </div>
            <span class="muted-cell">${F.num(b.gasUsed)}</span>
          </div>
        </td>
        <td class="muted-cell">${F.num(b.gasLimit)}</td>
        <td class="muted-cell">${b.baseFee} Gwei</td>
        <td style="font-weight:500;color:var(--text-dark)">${b.reward.toFixed(5)} ETH</td>
      </tr>`).join('');
    paginate('blocks-pag', bPage, Math.ceil(all.length / BPER), p => { bPage = p; renderBlocks(); });
  }

  // ── Transactions page ─────────────────────────────────────
  let tPage = 1; const TPER = 20;
  function renderTxs() {
    const all = BlockchainEngine.getLatestTxs(120);
    $('tx-count').textContent = F.num(all.length);
    const pg = all.slice((tPage - 1) * TPER, tPage * TPER);
    $('txs-tb').innerHTML = pg.map(tx => `
      <tr onclick="App.openTx('${tx.hash}')">
        <td><a class="hash-link">${F.hash(tx.hash)}</a></td>
        <td>${bMethod(tx.txType)}</td>
        <td><a class="hash-link" onclick="event.stopPropagation();App.openBlock(${tx.blockNumber})">${F.num(tx.blockNumber)}</a></td>
        <td class="age-cell">${F.ago(tx.timestamp)}</td>
        <td><a class="addr-link" onclick="event.stopPropagation();App.openAddress('${tx.from}')">${F.addr(tx.from)}</a></td>
        <td>${tx.value > 0 ? '<span style="color:var(--green);font-size:.85rem">▶</span>' : ''}</td>
        <td><a class="addr-link" onclick="event.stopPropagation();App.openAddress('${tx.to}')">${F.addr(tx.to)}</a></td>
        <td class="val-cell">${F.eth(tx.value)}</td>
        <td class="muted-cell">${F.fee(tx)}</td>
      </tr>`).join('');
    paginate('txs-pag', tPage, Math.ceil(all.length / TPER), p => { tPage = p; renderTxs(); });
  }

  // ── Pagination ────────────────────────────────────────────
  function paginate(id, cur, total, cb) {
    const el = $(id); if (!el) return;
    let h = `<button class="pg-btn" ${cur <= 1 ? 'disabled' : ''} onclick="(${cb.toString()})(${cur - 1})">« First</button>`;
    h += `<button class="pg-btn" ${cur <= 1 ? 'disabled' : ''} onclick="(${cb.toString()})(${cur - 1})">‹</button>`;
    let s = Math.max(1, cur - 2), e = Math.min(total, s + 4); if (e - s < 4) s = Math.max(1, e - 4);
    for (let p = s; p <= e; p++)
      h += `<button class="pg-btn ${p === cur ? 'active' : ''}" onclick="(${cb.toString()})(${p})">${p}</button>`;
    h += `<button class="pg-btn" ${cur >= total ? 'disabled' : ''} onclick="(${cb.toString()})(${cur + 1})">›</button>`;
    h += `<button class="pg-btn" ${cur >= total ? 'disabled' : ''} onclick="(${cb.toString()})(${total})">Last »</button>`;
    h += `<span class="pg-info">Page ${cur} of ${total}</span>`;
    el.innerHTML = h;
  }

  // ── Block Modal ───────────────────────────────────────────
  function openBlock(num) {
    const b = BlockchainEngine.getBlockByNumber(num); if (!b) return;
    $('modal-title').textContent = `Block #${F.num(b.number)}`;
    $('modal-body').innerHTML = `
      ${dr('Block Height', F.num(b.number))}
      ${dr('Status', '<span class="badge b-success">✓ Finalized</span>')}
      ${dr('Timestamp', F.ts(b.timestamp) + ' | ' + F.ago(b.timestamp))}
      ${dr('Transactions', `<a class="hash-link">${F.num(b.txCount)} transactions</a> in this block`)}
      ${dr('Fee Recipient', `<a class="addr-link mono" onclick="App.openAddress('${b.miner}')">${b.miner}</a>`)}
      ${dr('Block Reward', b.reward.toFixed(6) + ' ETH')}
      ${dr('Gas Used', F.num(b.gasUsed) + ` (${F.pct(b.gasUsed, b.gasLimit)})`)}
      ${dr('Gas Limit', F.num(b.gasLimit))}
      ${dr('Base Fee Per Gas', b.baseFee + ' Gwei')}
      ${dr('Block Hash', `<span class="mono" style="font-size:.78rem;word-break:break-all">${b.hash}</span>`)}
      ${dr('Parent Hash', `<span class="mono" style="font-size:.78rem;color:var(--text-muted)">${F.hash(b.parentHash)}</span>`)}
      ${dr('Nonce', `<span class="mono">${b.nonce}</span>`)}
      ${dr('Size', F.bytes(b.size))}
    `;
    // Inject tx sub-table
    const subHtml = `
      <div class="sub-section-title">Transactions</div>
      <div class="sub-tbl-wrap">
        <table>
          <thead><tr style="background:var(--bg)">
            <th style="padding:8px 12px;font-size:.68rem;color:var(--text-muted);border-bottom:1px solid var(--border)">Txn Hash</th>
            <th style="padding:8px 12px;font-size:.68rem;color:var(--text-muted);border-bottom:1px solid var(--border)">Method</th>
            <th style="padding:8px 12px;font-size:.68rem;color:var(--text-muted);border-bottom:1px solid var(--border)">From</th>
            <th style="padding:8px 12px;font-size:.68rem;color:var(--text-muted);border-bottom:1px solid var(--border)">To</th>
            <th style="padding:8px 12px;font-size:.68rem;color:var(--text-muted);border-bottom:1px solid var(--border)">Value</th>
            <th style="padding:8px 12px;font-size:.68rem;color:var(--text-muted);border-bottom:1px solid var(--border)">Status</th>
          </tr></thead>
          <tbody>
            ${b.transactions.slice(0, 20).map(tx => `
              <tr onclick="App.openTx('${tx.hash}')" style="border-bottom:1px solid var(--border);cursor:pointer">
                <td style="padding:8px 12px"><a class="hash-link">${F.hash(tx.hash)}</a></td>
                <td style="padding:8px 12px">${bMethod(tx.txType)}</td>
                <td style="padding:8px 12px"><a class="addr-link">${F.addr(tx.from)}</a></td>
                <td style="padding:8px 12px"><a class="addr-link">${F.addr(tx.to)}</a></td>
                <td style="padding:8px 12px;font-size:.8rem">${F.eth(tx.value)}</td>
                <td style="padding:8px 12px">${bStatus(tx.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    $('modal-body').insertAdjacentHTML('afterend', subHtml);
    openModal();
  }

  function dr(k, v) {
    return `<tr><td>${k}</td><td>${v}</td></tr>`;
  }

  // ── TX Modal ──────────────────────────────────────────────
  function openTx(hash) {
    const tx = BlockchainEngine.getTxByHash(hash); if (!tx) return;
    $('modal-title').textContent = 'Transaction Details';
    $('modal-body').innerHTML = `
      ${dr('Transaction Hash', `<span class="mono" style="font-size:.78rem;word-break:break-all;color:var(--blue)">${tx.hash}</span>`)}
      ${dr('Status', bStatus(tx.status) + '&nbsp;&nbsp;' + tx.confirmations + ' Block Confirmations')}
      ${dr('Block', `<a class="hash-link" onclick="App.openBlock(${tx.blockNumber})">${F.num(tx.blockNumber)}</a>`)}
      ${dr('Timestamp', F.ts(tx.timestamp) + ' | ' + F.ago(tx.timestamp))}
      ${dr('From', `<a class="addr-link mono" onclick="App.openAddress('${tx.from}')">${tx.from}</a>`)}
      ${dr('Interacted With (To)', `<a class="addr-link mono" onclick="App.openAddress('${tx.to}')">${tx.to}</a>`)}
      ${dr('Value', `<b>${F.eth(tx.value)}</b> <span style="color:var(--text-muted)">($${(tx.value * BlockchainEngine.getNetworkStats().ethPrice).toFixed(2)})</span>`)}
      ${dr('Transaction Fee', F.fee(tx) + ' ETH')}
      ${dr('Gas Price', tx.gasPrice + ' Gwei')}
      ${dr('Gas Limit & Usage', F.num(tx.gasLimit) + ' | ' + F.num(tx.gasUsed) + ' (' + (tx.gasUsed / tx.gasLimit * 100).toFixed(1) + '%)')}
      ${dr('Input Data', `<span class="mono" style="font-size:.75rem;color:var(--text-muted);word-break:break-all">${tx.input.slice(0, 150)}${tx.input.length > 150 ? '…' : ''}</span>`)}
    `;
    openModal();
  }

  // ── Modal ─────────────────────────────────────────────────
  function openModal() { $('modal-backdrop').classList.add('open'); }
  function closeModal() { $('modal-backdrop').classList.remove('open'); }
  $('modal-backdrop').addEventListener('click', e => { if (e.target === $('modal-backdrop')) closeModal(); });
  $('modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ── Address lookup ────────────────────────────────────────
  function openAddress(addr, e) {
    if (e) { e.stopPropagation(); }
    goPage('address');
    $('addr-inp').value = addr || '';
    if (addr) doAddrLookup(addr);
  }

  function doAddrLookup(raw) {
    const addr = (raw || $('addr-inp').value || '').trim().toLowerCase();
    if (!addr) return;
    const d = BlockchainEngine.getAddressData(addr);
    const ep = BlockchainEngine.getNetworkStats().ethPrice;
    $('addr-result').style.display = 'block';
    $('a-addr').textContent = d.address;
    $('a-bal').textContent = d.balance.toFixed(6) + ' ETH';
    $('a-usd').textContent = '$ ' + (d.balance * ep).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' USD';
    $('a-txcount').textContent = F.num(d.txCount);

    $('addr-tb').innerHTML = d.txHistory.length
      ? d.txHistory.map(tx => `
          <tr onclick="App.openTx('${tx.hash}')">
            <td><a class="hash-link">${F.hash(tx.hash)}</a></td>
            <td>${bMethod(tx.txType)}</td>
            <td class="age-cell">${F.ago(tx.timestamp)}</td>
            <td><a class="addr-link" onclick="event.stopPropagation();App.openAddress('${tx.from}')">${F.addr(tx.from)}</a></td>
            <td>${bDirection(tx.from, addr)}</td>
            <td><a class="addr-link" onclick="event.stopPropagation();App.openAddress('${tx.to}')">${F.addr(tx.to)}</a></td>
            <td class="val-cell">${F.eth(tx.value)}</td>
            <td class="muted-cell">${F.fee(tx)}</td>
          </tr>`).join('')
      : '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">No transactions found for this address.</td></tr>';
  }

  $('addr-btn').addEventListener('click', () => doAddrLookup());
  $('addr-inp').addEventListener('keydown', e => { if (e.key === 'Enter') doAddrLookup(); });

  function renderQuickChips() {
    $('quick-chips').innerHTML = BlockchainEngine.getKnownAddresses().slice(0, 8)
      .map(a => `<div class="chip" onclick="App.openAddress('${a}')" title="${a}">${F.addr(a)}</div>`)
      .join('');
  }

  // ── Gas cards ─────────────────────────────────────────────
  function refreshGasCards() {
    const g = BlockchainEngine.getCurrentGas();
    const ep = BlockchainEngine.getNetworkStats().ethPrice;
    const usd = gw => '~$' + ((gw * 21000 * 1e-9) * ep).toFixed(4) + ' for transfer';
    $('g-slow').textContent = g.slow;
    $('g-std').textContent = g.standard;
    $('g-fast').textContent = g.fast;
    $('g-instant').textContent = g.instant;
    $('g-slow-u').textContent = usd(g.slow);
    $('g-std-u').textContent = usd(g.standard);
    $('g-fast-u').textContent = usd(g.fast);
    $('g-instant-u').textContent = usd(g.instant);
  }

  // ── Network stats ─────────────────────────────────────────
  function refreshNetStats() {
    const s = BlockchainEngine.getNetworkStats();
    $('n-block').textContent = '#' + F.num(s.latestBlock);
    $('n-txs').textContent = F.num(s.totalTxs);
    $('n-hash').textContent = s.hashrate;
    $('n-diff').textContent = F.num(s.difficulty);
    $('n-btime').textContent = s.avgBlockTime;
    $('n-peers').textContent = s.peers;
    $('n-tps').textContent = s.tps;
    $('n-pending').textContent = F.num(s.pendingTxs);
    $('n-mcap').textContent = s.marketCap;
  }

  // ── Search ────────────────────────────────────────────────
  function doSearch(q) {
    q = (q || '').trim();
    if (!q) return;
    const alert = $('home-alert');
    alert.classList.remove('show');
    const r = BlockchainEngine.searchAll(q);
    if (!r) {
      goPage('home');
      alert.textContent = `⚠ Sorry! We were unable to find any result matching "${q}"`;
      alert.classList.add('show');
      return;
    }
    if (r.type === 'block') { goPage('blocks'); setTimeout(() => openBlock(r.data.number), 80); }
    else if (r.type === 'tx') { goPage('transactions'); setTimeout(() => openTx(r.data.hash), 80); }
    else { openAddress(r.data.address); }
  }

  ['nav-input', 'hero-input'].forEach(id => {
    $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(e.target.value); });
  });
  $('nav-btn')?.addEventListener('click', () => doSearch($('nav-input')?.value));
  $('hero-btn')?.addEventListener('click', () => doSearch($('hero-input')?.value));

  // ── Export ────────────────────────────────────────────────
  function dl(content, type, name) {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([content], { type })), download: name
    }); a.click(); URL.revokeObjectURL(a.href);
  }
  $('exp-csv')?.addEventListener('click', () => {
    const rows = [['Hash', 'Block', 'From', 'To', 'Value (ETH)', 'Gas (Gwei)', 'Status', 'Type', 'Timestamp']];
    BlockchainEngine.getLatestTxs(100).forEach(t => rows.push([t.hash, t.blockNumber, t.from, t.to, t.value, t.gasPrice, t.status, t.txType, new Date(t.timestamp * 1000).toISOString()]));
    dl(rows.map(r => r.join(',')).join('\n'), 'text/csv', 'chainscope_txs.csv');
  });
  $('exp-json')?.addEventListener('click', () =>
    dl(JSON.stringify(BlockchainEngine.getLatestTxs(100), null, 2), 'application/json', 'chainscope_txs.json'));

  // ── Real-time updates ─────────────────────────────────────
  function startRealtime() {
    setInterval(() => {
      BlockchainEngine.mintBlock();
      refreshStatsBar();
      renderHomeLists();
      if (currentPage === 'blocks') renderBlocks();
      if (currentPage === 'transactions') renderTxs();
      if (currentPage === 'network') { Charts.updateTxVolChart(); Charts.updateHashrateChart(); refreshNetStats(); }
    }, 5000);

    setInterval(() => {
      refreshStatsBar();
      if (currentPage === 'gas') { refreshGasCards(); Charts.updateGasChart(); }
    }, 1500);
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    refreshStatsBar();
    drawSparkline();
    renderHomeLists();
    renderBlocks();
    renderTxs();
    renderQuickChips();
    startRealtime();
  }

  window.App = { openBlock, openTx, openAddress, goPage };
  document.addEventListener('DOMContentLoaded', init);
})();
