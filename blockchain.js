// ============================================================
// blockchain.js — Mock Blockchain Data Engine
// Simulates an Ethereum-style blockchain in memory.
// To connect a real server later, replace the generator
// functions with fetch() calls to your API endpoints.
// ============================================================

const BlockchainEngine = (() => {
  // ── Utilities ────────────────────────────────────────────
  const HEX_CHARS = '0123456789abcdef';
  function randHex(len) {
    let s = '0x';
    for (let i = 0; i < len; i++) s += HEX_CHARS[Math.floor(Math.random() * 16)];
    return s;
  }
  function randBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max, dec = 4) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
  function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Pretty-print addresses
  const knownMiners = [
    '0xf8b483dba2c3b7176a3da549ad41a48bb3121069',
    '0x52bc44d5378309ee2abf1539bf71de1b7d7be3b5',
    '0xb2930b35844a230f00e51431acae96fe543a0347',
    '0x829bd824b016326a401d083b33d092293333a830',
    '0x4bb96091ee9d802ed039c4d1a5f6216f90f81b01',
  ];

  const knownAddresses = Array.from({ length: 30 }, () => randHex(40));
  knownAddresses.push(...knownMiners);

  // ── In-memory chain ──────────────────────────────────────
  let chain = [];        // array of block objects
  let txPool = [];       // all transactions indexed
  let balanceMap = {};   // address → ETH balance

  // Pre-populate balances
  knownAddresses.forEach(addr => {
    balanceMap[addr] = randFloat(0.001, 9999, 6);
  });

  // ── Block Builder ────────────────────────────────────────
  function buildBlock(number, timestamp) {
    const miner      = randFrom(knownMiners);
    const txCount    = randBetween(50, 300);
    const gasLimit   = 30_000_000;
    const gasUsed    = randBetween(Math.floor(gasLimit * 0.4), gasLimit);
    const baseFee    = randBetween(8, 120);
    const reward     = randFloat(0.05, 2.5, 6);
    const size       = randBetween(20_000, 100_000);

    const txs = Array.from({ length: txCount }, () => buildTx(number, timestamp, baseFee));
    return {
      number,
      hash: randHex(64),
      parentHash: number > 0 ? chain[chain.length - 1]?.hash ?? randHex(64) : randHex(64),
      miner,
      timestamp,
      txCount,
      gasUsed,
      gasLimit,
      baseFee,
      reward,
      size,
      difficulty: randBetween(3_000_000_000_000, 9_000_000_000_000),
      nonce: randHex(16),
      extraData: randHex(32),
      stateRoot: randHex(64),
      transactions: txs,
    };
  }

  // ── Transaction Builder ──────────────────────────────────
  function buildTx(blockNumber, blockTimestamp, baseFee) {
    const from = randFrom(knownAddresses);
    let to = randFrom(knownAddresses);
    while (to === from) to = randFrom(knownAddresses);
    const value = randFloat(0, 50, 6);
    const gasPrice = baseFee + randBetween(1, 30);
    const gasLimit = randFrom([21000, 35000, 63000, 100000, 150000, 200000]);
    const gasUsed = Math.floor(gasLimit * randFloat(0.5, 1, 2));
    const status = Math.random() > 0.05 ? 'success' : 'failed';
    const txType = randFrom(['transfer', 'swap', 'contract', 'mint', 'stake']);

    // Update balances
    if (status === 'success') {
      balanceMap[from] = Math.max(0, (balanceMap[from] || 0) - value - (gasUsed * gasPrice) / 1e9);
      balanceMap[to] = (balanceMap[to] || 0) + value;
    }

    return {
      hash: randHex(64),
      blockNumber,
      blockHash: null, // filled after block creation
      from,
      to,
      value,
      gasPrice,
      gasLimit,
      gasUsed,
      status,
      txType,
      timestamp: blockTimestamp,
      nonce: randBetween(0, 9999),
      input: txType === 'transfer' ? '0x' : randHex(128),
      confirmations: 0, // updated dynamically
    };
  }

  // ── Network Stats ────────────────────────────────────────
  let _gasHistory = []; // { time, slow, standard, fast, instant }

  // Real ETH price — fetched from CoinGecko, ticks smoothly between fetches
  let _ethPrice = 1922.24; // fallback until first fetch (real price as of Feb 2026)
  let _ethChange = 0;

  async function fetchRealEthPrice() {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true',
        { cache: 'no-store' }
      );
      const data = await res.json();
      _ethPrice = data.ethereum.usd;
      _ethChange = parseFloat(data.ethereum.usd_24h_change.toFixed(2));
    } catch (e) {
      console.warn('CoinGecko fetch failed, using last known price:', e);
    }
  }

  // Fetch immediately on load, then every 60s
  fetchRealEthPrice();
  setInterval(fetchRealEthPrice, 60000);

  // Smooth ticker: tiny ±0.01% drift every 1.5s so price feels alive
  setInterval(() => {
    const drift = _ethPrice * (Math.random() * 0.0002 - 0.0001);
    _ethPrice = parseFloat((_ethPrice + drift).toFixed(2));
  }, 1500);
  function generateGasSample() {
    const base = randBetween(8, 80);
    return {
      time: Date.now(),
      slow: base,
      standard: base + randBetween(3, 15),
      fast: base + randBetween(20, 50),
      instant: base + randBetween(60, 120),
    };
  }

  // ── Initialise chain ─────────────────────────────────────
  function init(numBlocks = 50) {
    chain = [];
    txPool = [];
    let ts = Math.floor(Date.now() / 1000) - numBlocks * 12; // ~12s per block
    for (let i = 0; i < numBlocks; i++) {
      const block = buildBlock(18_500_000 + i, ts);
      block.transactions.forEach(tx => {
        tx.blockHash = block.hash;
        tx.confirmations = numBlocks - i;
      });
      txPool.push(...block.transactions);
      chain.push(block);
      ts += randBetween(10, 15);
    }
    // Seed gas history
    for (let i = 30; i >= 0; i--) {
      _gasHistory.push({ ...generateGasSample(), time: Date.now() - i * 3000 });
    }
  }

  // ── Add new block (called by real-time ticker) ───────────
  function mintBlock() {
    const prev = chain[chain.length - 1];
    const ts = Math.floor(Date.now() / 1000);
    const block = buildBlock(prev.number + 1, ts);
    block.parentHash = prev.hash;
    block.transactions.forEach(tx => {
      tx.blockHash = block.hash;
      tx.confirmations = 1;
    });
    // bump confirmations on previous blocks
    chain.forEach((b, idx) => {
      b.transactions.forEach(tx => tx.confirmations = chain.length - idx);
    });
    txPool.push(...block.transactions);
    if (txPool.length > 10000) txPool.splice(0, txPool.length - 10000); // cap
    chain.push(block);
    if (chain.length > 200) chain.shift(); // keep last 200 blocks

    // new gas sample
    _gasHistory.push(generateGasSample());
    if (_gasHistory.length > 60) _gasHistory.shift();

    return block;
  }

  // ── Public API ───────────────────────────────────────────
  function getLatestBlocks(n = 10) {
    return [...chain].reverse().slice(0, n);
  }

  function getLatestTxs(n = 20) {
    return [...txPool].reverse().slice(0, n);
  }

  function getBlockByNumber(num) {
    return chain.find(b => b.number === num) || null;
  }

  function getBlockByHash(hash) {
    return chain.find(b => b.hash.toLowerCase() === hash.toLowerCase()) || null;
  }

  function getTxByHash(hash) {
    return txPool.find(tx => tx.hash.toLowerCase() === hash.toLowerCase()) || null;
  }

  function getAddressData(addr) {
    addr = addr.toLowerCase();
    const history = txPool
      .filter(tx => tx.from === addr || tx.to === addr)
      .reverse()
      .slice(0, 50);
    return {
      address: addr,
      balance: parseFloat((balanceMap[addr] || randFloat(0, 100, 6)).toFixed(6)),
      txCount: history.length,
      txHistory: history,
    };
  }

  function getNetworkStats() {
    const latest = chain[chain.length - 1];
    const blockTime = 12.1; // avg seconds
    const tps = parseFloat((latest.txCount / blockTime).toFixed(2));
    return {
      latestBlock: latest.number,
      totalTxs: txPool.length,
      hashrate: randFloat(800, 1100, 2) + ' TH/s',
      difficulty: latest.difficulty,
      avgBlockTime: blockTime + 's',
      peers: randBetween(60, 120),
      tps,
      ethPrice: _ethPrice,
      ethChange: _ethChange,
      marketCap: '~$' + (_ethPrice * 120.18 / 1000).toFixed(1) + 'B',
      pendingTxs: randBetween(80000, 250000),
    };
  }

  function getGasHistory() { return [..._gasHistory]; }

  function getCurrentGas() { return _gasHistory[_gasHistory.length - 1] || generateGasSample(); }

  function searchAll(query) {
    query = query.trim().toLowerCase();
    if (!query) return null;

    // Block number?
    const num = parseInt(query, 10);
    if (!isNaN(num)) {
      const block = getBlockByNumber(num);
      if (block) return { type: 'block', data: block };
    }

    // Full/partial tx hash?
    const tx = txPool.find(t => t.hash.toLowerCase().startsWith(query));
    if (tx) return { type: 'tx', data: tx };

    // Full/partial block hash?
    const block = chain.find(b => b.hash.toLowerCase().startsWith(query));
    if (block) return { type: 'block', data: block };

    // Address?
    const addrData = getAddressData(query);
    if (addrData.txCount > 0 || balanceMap[query] !== undefined) {
      return { type: 'address', data: addrData };
    }

    return null;
  }

  function getKnownAddresses() { return [...knownAddresses]; }

  // Initialise on load
  init(50);

  return {
    mintBlock,
    getLatestBlocks,
    getLatestTxs,
    getBlockByNumber,
    getBlockByHash,
    getTxByHash,
    getAddressData,
    getNetworkStats,
    getGasHistory,
    getCurrentGas,
    searchAll,
    getKnownAddresses,
  };
})();
