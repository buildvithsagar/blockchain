// ============================================================
// charts.js — Chart.js Visualization Wrappers
// Requires Chart.js loaded from CDN before this file.
// ============================================================

const Charts = (() => {
    let gasChart = null;
    let txVolChart = null;
    let hashrateChart = null;

    const BLUE = 'rgba(59,130,246,';
    const VIOLET = 'rgba(139,92,246,';
    const CYAN = 'rgba(6,182,212,';
    const GREEN = 'rgba(16,185,129,';

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    function makeGrad(ctx, colorStart, colorEnd) {
        const g = ctx.createLinearGradient(0, 0, 0, 220);
        g.addColorStop(0, colorStart);
        g.addColorStop(1, colorEnd);
        return g;
    }

    // ── Gas Price Line Chart ─────────────────────────────────
    function initGasChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const history = BlockchainEngine.getGasHistory().slice(-30);
        const labels = history.map((_, i) => `-${(history.length - 1 - i) * 3}s`);

        if (gasChart) { gasChart.destroy(); gasChart = null; }

        gasChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Slow',
                        data: history.map(h => h.slow),
                        borderColor: GREEN + '0.9)',
                        backgroundColor: GREEN + '0.08)',
                        fill: true, tension: 0.45, borderWidth: 2, pointRadius: 0,
                    },
                    {
                        label: 'Standard',
                        data: history.map(h => h.standard),
                        borderColor: BLUE + '0.9)',
                        backgroundColor: BLUE + '0.08)',
                        fill: true, tension: 0.45, borderWidth: 2, pointRadius: 0,
                    },
                    {
                        label: 'Fast',
                        data: history.map(h => h.fast),
                        borderColor: VIOLET + '0.9)',
                        backgroundColor: VIOLET + '0.08)',
                        fill: true, tension: 0.45, borderWidth: 2, pointRadius: 0,
                    },
                    {
                        label: 'Instant',
                        data: history.map(h => h.instant),
                        borderColor: 'rgba(245,158,11,0.9)',
                        backgroundColor: 'rgba(245,158,11,0.07)',
                        fill: true, tension: 0.45, borderWidth: 2, pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, padding: 16, font: { size: 11 } } },
                    tooltip: {
                        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} Gwei` },
                    },
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxTicksLimit: 8 } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => v + ' Gw' } },
                },
                animation: { duration: 400 },
            },
        });
    }

    function updateGasChart() {
        if (!gasChart) return;
        const history = BlockchainEngine.getGasHistory().slice(-30);
        const labels = history.map((_, i) => `-${(history.length - 1 - i) * 3}s`);
        gasChart.data.labels = labels;
        gasChart.data.datasets[0].data = history.map(h => h.slow);
        gasChart.data.datasets[1].data = history.map(h => h.standard);
        gasChart.data.datasets[2].data = history.map(h => h.fast);
        gasChart.data.datasets[3].data = history.map(h => h.instant);
        gasChart.update('none');
    }

    // ── TX Volume Bar Chart ──────────────────────────────────
    function initTxVolChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const blocks = BlockchainEngine.getLatestBlocks(20).reverse();

        if (txVolChart) { txVolChart.destroy(); txVolChart = null; }

        txVolChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: blocks.map(b => '#' + b.number),
                datasets: [{
                    label: 'Transactions',
                    data: blocks.map(b => b.txCount),
                    backgroundColor: CYAN + '0.6)',
                    borderColor: CYAN + '0.9)',
                    borderWidth: 1,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' } },
                },
                animation: { duration: 500 },
            },
        });
    }

    function updateTxVolChart() {
        if (!txVolChart) return;
        const blocks = BlockchainEngine.getLatestBlocks(20).reverse();
        txVolChart.data.labels = blocks.map(b => '#' + b.number);
        txVolChart.data.datasets[0].data = blocks.map(b => b.txCount);
        txVolChart.update('none');
    }

    // ── Hashrate Sparkline ───────────────────────────────────
    function initHashrateChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const points = Array.from({ length: 20 }, () => (800 + Math.random() * 300).toFixed(1));

        if (hashrateChart) { hashrateChart.destroy(); hashrateChart = null; }

        hashrateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: points.map((_, i) => i),
                datasets: [{
                    data: points,
                    borderColor: VIOLET + '0.9)',
                    backgroundColor: VIOLET + '0.08)',
                    fill: true, tension: 0.5, borderWidth: 2, pointRadius: 0,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } },
                animation: { duration: 800 },
            },
        });
    }

    function updateHashrateChart() {
        if (!hashrateChart) return;
        const newVal = (800 + Math.random() * 300).toFixed(1);
        hashrateChart.data.datasets[0].data.push(newVal);
        hashrateChart.data.datasets[0].data.shift();
        hashrateChart.update('none');
    }

    return {
        initGasChart, updateGasChart,
        initTxVolChart, updateTxVolChart,
        initHashrateChart, updateHashrateChart,
    };
})();
