/**
 * StockPulse — Main Application
 * SPA routing, event binding, state management, UI rendering
 */

const App = (() => {
    // State
    let currentPage = 'dashboard';
    let currentAnalysisStock = null;
    let currentAnalysisRange = '3mo';
    let watchlistQuotes = [];

    // ============================
    // Initialization
    // ============================

    function init() {
        initIcons();
        initClock();
        initNavigation();
        initSearch();
        initWatchlistPage();
        initAnalysisPage();
        initSignalsPage();
        initMobileNav();

        // Load dashboard
        refreshWatchlistTable();
    }

    function initIcons() {
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // ============================
    // Clock
    // ============================

    function initClock() {
        const clockEl = document.getElementById('clock');
        function updateClock() {
            const now = new Date();
            clockEl.textContent = now.toLocaleString('zh-TW', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });
        }
        updateClock();
        setInterval(updateClock, 1000);

        // Market status
        updateMarketStatus();
        setInterval(updateMarketStatus, 60000);
    }

    function updateMarketStatus() {
        const statusEl = document.getElementById('marketStatus');
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const day = now.getDay();
        const time = hours * 60 + minutes;

        // Taiwan market hours: Mon-Fri 9:00-13:30
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = time >= 540 && time <= 810;
        const isOpen = isWeekday && isMarketHours;

        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('span');

        if (isOpen) {
            dot.className = 'status-dot open';
            text.textContent = '市場開盤中';
        } else {
            dot.className = 'status-dot closed';
            const nextOpen = getNextMarketOpen();
            text.textContent = `休市中 · ${nextOpen}`;
        }
    }

    function getNextMarketOpen() {
        const now = new Date();
        const day = now.getDay();
        const hours = now.getHours();
        const time = hours * 60 + now.getMinutes();

        if (day >= 1 && day <= 5 && time < 540) {
            return '今日 09:00 開盤';
        }
        if (day === 5 && time >= 810) {
            return '下週一 09:00 開盤';
        }
        if (day === 6) {
            return '下週一 09:00 開盤';
        }
        if (day === 0) {
            return '明日 09:00 開盤';
        }
        return '明日 09:00 開盤';
    }

    // ============================
    // Navigation
    // ============================

    function initNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo(item.getAttribute('data-page'));
            });
        });

        // btn-text links
        document.querySelectorAll('[data-page]').forEach(el => {
            if (!el.classList.contains('nav-item')) {
                el.addEventListener('click', () => {
                    navigateTo(el.getAttribute('data-page'));
                });
            }
        });

        // Refresh button
        document.getElementById('refreshAllBtn').addEventListener('click', async () => {
            const btn = document.getElementById('refreshAllBtn');
            btn.classList.add('spinning');
            await refreshDashboard();
            btn.classList.remove('spinning');
            showToast('已重新整理所有資料', 'success');
        });
    }

    function navigateTo(page) {
        currentPage = page;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });

        // Show target page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        // Close mobile nav
        document.getElementById('sidebar').classList.remove('open');

        // Trigger page-specific actions
        if (page === 'dashboard') refreshWatchlistTable();
        if (page === 'signals') {
            document.getElementById('signalsOverview').style.display = 'block';
            loadSignalsOverview();
        }
    }

    // ============================
    // Mobile Nav
    // ============================

    function initMobileNav() {
        document.getElementById('mobileNavToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Close on click outside
        document.getElementById('mainContent').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
        });
    }

    // ============================
    // Global Search
    // ============================

    function initSearch() {
        const input = document.getElementById('globalSearch');
        const results = document.getElementById('searchResults');

        input.addEventListener('input', async () => {
            const query = input.value.trim();
            if (query.length === 0) {
                results.classList.add('hidden');
                return;
            }
            const matches = await StockAPI.searchStock(query);
            renderSearchResults(results, matches, async (stock) => {
                input.value = '';
                results.classList.add('hidden');
                navigateTo('analysis');

                // Show loading immediately
                showLoading(true);
                // When clicking the search result, fetchQuote will verify and save the name
                try {
                    await StockAPI.fetchQuote(stock.symbol);
                    loadAnalysis(stock.symbol);
                } catch (e) {
                    showLoading(false);
                    showToast('找不到此股票代碼', 'error');
                }
            });
        });

        input.addEventListener('focus', () => {
            if (input.value.trim().length > 0) {
                results.classList.remove('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.classList.add('hidden');
            }
        });
    }

    function renderSearchResults(container, stocks, onSelect) {
        if (stocks.length === 0) {
            container.innerHTML = '<div class="search-result-item"><span class="stock-name">找不到相符的股票</span></div>';
            container.classList.remove('hidden');
            return;
        }

        container.innerHTML = stocks.map(stock => `
            <div class="search-result-item" data-symbol="${stock.symbol}" data-name="${stock.name}">
                <div>
                    <span class="stock-symbol">${stock.symbol}</span>
                    <span class="stock-name" style="margin-left: 8px;">${stock.name}</span>
                </div>
                <span class="stock-name">${stock.industry}</span>
            </div>
        `).join('');

        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                onSelect({ symbol: item.dataset.symbol, name: item.dataset.name });
            });
        });

        container.classList.remove('hidden');
    }

    // ============================
    // Dashboard (Merged Watchlist)
    // ============================

    function initWatchlistPage() {
        const input = document.getElementById('addStockInput');
        const results = document.getElementById('addStockResults');
        const addBtn = document.getElementById('addStockBtn');

        input.addEventListener('input', async () => {
            const query = input.value.trim();
            if (query.length === 0) {
                results.classList.add('hidden');
                return;
            }
            const matches = await StockAPI.searchStock(query);
            renderSearchResults(results, matches, async (stock) => {
                input.value = '';
                results.classList.add('hidden');

                // Fetch first to verify and get name
                try {
                    showToast('驗證中...', 'info');
                    const quote = await StockAPI.fetchQuote(stock.symbol);
                    addStockToWatchlist(quote.symbol, quote.name);
                } catch (e) {
                    showToast('驗證失敗，找不到此股票', 'error');
                }
            });
        });

        addBtn.addEventListener('click', async () => {
            const code = input.value.trim();
            if (code) {
                try {
                    showToast('驗證中...', 'info');
                    const quote = await StockAPI.fetchQuote(code);
                    addStockToWatchlist(quote.symbol, quote.name);
                    input.value = '';
                    results.classList.add('hidden');
                } catch (e) {
                    showToast('找不到此股票', 'error');
                }
            }
        });

        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const code = input.value.trim();
                if (code) {
                    try {
                        showToast('驗證中...', 'info');
                        const quote = await StockAPI.fetchQuote(code);
                        addStockToWatchlist(quote.symbol, quote.name);
                        input.value = '';
                        results.classList.add('hidden');
                    } catch (e) {
                        showToast('找不到此股票', 'error');
                    }
                }
            }
        });

        document.getElementById('refreshWatchlistBtn').addEventListener('click', async () => {
            showToast('正在更新報價...', 'info');
            await refreshWatchlistTable();
            showToast('報價已更新', 'success');
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.classList.add('hidden');
            }
        });
    }

    function addStockToWatchlist(symbol, name) {
        const result = Watchlist.addStock(symbol, name);
        if (result.success) {
            showToast(result.message, 'success');
            refreshWatchlistTable();
        } else {
            showToast(result.message, 'error');
        }
    }

    async function refreshWatchlistTable() {
        const symbols = Watchlist.getSymbols();
        const tbody = document.getElementById('watchlistBody');

        if (symbols.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            <p>追蹤清單是空的，請新增股票開始追蹤</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Show loading
        tbody.innerHTML = symbols.map(s => `
            <tr>
                <td><span class="mono">${s}</span></td>
                <td>${StockAPI.getStockName(s)}</td>
                <td class="text-right"><div class="skeleton" style="width:60px;height:18px;display:inline-block"></div></td>
                <td class="text-right"><div class="skeleton" style="width:50px;height:18px;display:inline-block"></div></td>
                <td class="text-right"><div class="skeleton" style="width:55px;height:18px;display:inline-block"></div></td>
                <td class="text-right"><div class="skeleton" style="width:70px;height:18px;display:inline-block"></div></td>
                <td class="text-center">-</td>
            </tr>
        `).join('');

        try {
            const quotes = await StockAPI.fetchMultipleQuotes(symbols);
            watchlistQuotes = quotes;

            tbody.innerHTML = symbols.map(sym => {
                const q = quotes.find(x => x.symbol === sym);
                if (!q) {
                    return `
                        <tr>
                            <td><span class="mono">${sym}</span></td>
                            <td>${StockAPI.getStockName(sym)}</td>
                            <td colspan="4" class="text-center" style="color:var(--text-muted)">無法取得報價</td>
                            <td class="text-center">
                                <button class="btn btn-danger btn-sm remove-stock-btn" data-symbol="${sym}">移除</button>
                            </td>
                        </tr>
                    `;
                }

                const isGain = q.changePercent >= 0;
                const colorClass = isGain ? 'gain' : 'loss';
                const arrow = isGain ? '▲' : '▼';

                return `
                    <tr class="watchlist-row" data-symbol="${sym}" style="cursor:pointer">
                        <td><span class="mono" style="color:var(--accent-blue);font-weight:600">${sym}</span></td>
                        <td>${q.name}</td>
                        <td class="text-right mono" style="font-weight:600">${q.price.toFixed(2)}</td>
                        <td class="text-right mono ${colorClass}">${isGain ? '+' : ''}${q.change.toFixed(2)}</td>
                        <td class="text-right mono ${colorClass}">${arrow} ${Math.abs(q.changePercent).toFixed(2)}%</td>
                        <td class="text-right mono" style="color:var(--text-secondary)">${formatVolume(q.volume)}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline analyze-btn" data-symbol="${sym}" title="分析"
                                style="margin-right:4px">
                                📊
                            </button>
                            <button class="btn btn-danger btn-sm remove-stock-btn" data-symbol="${sym}" title="移除">
                                ✕
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Row click -> analysis
            tbody.querySelectorAll('.watchlist-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    navigateTo('analysis');
                    loadAnalysis(row.dataset.symbol);
                });
            });

            // Analyze buttons
            tbody.querySelectorAll('.analyze-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigateTo('analysis');
                    loadAnalysis(btn.dataset.symbol);
                });
            });

            // Remove buttons
            tbody.querySelectorAll('.remove-stock-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const result = Watchlist.removeStock(btn.dataset.symbol);
                    showToast(result.message, 'success');
                    refreshWatchlistTable();
                });
            });

        } catch (err) {
            console.error('Watchlist refresh error:', err);
            showToast('更新報價失敗', 'error');
        }
    }

    // ============================
    // Analysis Page
    // ============================

    function initAnalysisPage() {
        const input = document.getElementById('analysisStockInput');
        const results = document.getElementById('analysisStockResults');

        input.addEventListener('input', async () => {
            const query = input.value.trim();
            if (query.length === 0) {
                results.classList.add('hidden');
                return;
            }
            const matches = await StockAPI.searchStock(query);
            renderSearchResults(results, matches, async (stock) => {
                input.value = '';
                results.classList.add('hidden');
                try {
                    showLoading(true);
                    await StockAPI.fetchQuote(stock.symbol);
                    loadAnalysis(stock.symbol);
                } catch (e) {
                    showLoading(false);
                    showToast('找不到此股票', 'error');
                }
            });
        });

        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const code = input.value.trim();
                if (code) {
                    input.value = '';
                    results.classList.add('hidden');
                    try {
                        showLoading(true);
                        await StockAPI.fetchQuote(code);
                        loadAnalysis(code);
                    } catch (e) {
                        showLoading(false);
                        showToast('找不到此股票', 'error');
                    }
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.classList.add('hidden');
            }
        });

        // Period buttons
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentAnalysisRange = btn.dataset.range;
                if (currentAnalysisStock) {
                    loadAnalysis(currentAnalysisStock);
                }
            });
        });

        // MA toggles
        ['toggleMA5', 'toggleMA10', 'toggleMA20', 'toggleMA60'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                if (currentAnalysisStock) {
                    updateMAOverlays();
                }
            });
        });
    }

    async function loadAnalysis(symbol) {
        currentAnalysisStock = symbol;

        // Show loading
        showLoading(true);
        document.getElementById('analysisEmpty').style.display = 'none';
        document.getElementById('analysisStockInfo').style.display = 'block';
        document.getElementById('chartCard').style.display = 'block';
        document.getElementById('indicatorsGrid').style.display = 'grid';

        try {
            // Fetch data
            const [quoteData, histData] = await Promise.all([
                StockAPI.fetchQuote(symbol),
                StockAPI.fetchHistory(symbol, currentAnalysisRange),
            ]);

            // Update stock info
            document.getElementById('analysisStockName').textContent = quoteData.name;
            document.getElementById('analysisStockCode').textContent = quoteData.symbol;
            document.getElementById('analysisStockPrice').textContent = quoteData.price.toFixed(2);

            const changeEl = document.getElementById('analysisStockChange');
            const isGain = quoteData.changePercent >= 0;
            changeEl.textContent = `${isGain ? '+' : ''}${quoteData.change.toFixed(2)} (${isGain ? '+' : ''}${quoteData.changePercent.toFixed(2)}%)`;
            changeEl.className = `stock-change ${isGain ? 'gain' : 'loss'}`;

            // Calculate signals for recommendation
            let signalHistData = histData;
            // Indicators need enough history, so fetch 6mo if current range is shorter
            if (currentAnalysisRange === '3mo') {
                signalHistData = await StockAPI.fetchHistory(symbol, '6mo');
            }
            const analysis = Indicators.generateSignals(signalHistData);

            const scoreEl = document.getElementById('analysisScore');
            const actionEl = document.getElementById('analysisAction');

            scoreEl.textContent = analysis.overallScore;
            let scoreColor = 'var(--text-primary)';
            if (analysis.overallScore >= 65) scoreColor = 'var(--gain)';
            else if (analysis.overallScore <= 35) scoreColor = 'var(--loss)';
            scoreEl.style.color = scoreColor;

            actionEl.textContent = analysis.action;
            actionEl.className = `action-badge ${analysis.actionClass}`;

            // Render charts
            Charts.renderCandlestickChart(
                document.getElementById('candlestickChart'),
                histData.history
            );
            Charts.renderVolumeChart(
                document.getElementById('volumeChart'),
                histData.history
            );

            updateMAOverlays(histData.history);

            // Render indicators
            const rsiVal = Charts.renderRSIChart(
                document.getElementById('rsiChart'),
                histData.history
            );
            document.getElementById('rsiValue').textContent = rsiVal ? rsiVal.toFixed(2) : '--';

            const macdVal = Charts.renderMACDChart(
                document.getElementById('macdChart'),
                histData.history
            );
            document.getElementById('macdValue').textContent = macdVal ? macdVal.toFixed(2) : '--';

            const bbVal = Charts.renderBollingerChart(
                document.getElementById('bollingerChart'),
                histData.history
            );
            document.getElementById('bollingerValue').textContent = bbVal || '--';

        } catch (err) {
            console.error('Analysis load error:', err);
            showToast(`無法載入 ${symbol} 的分析資料`, 'error');
            document.getElementById('analysisEmpty').style.display = 'block';
            document.getElementById('analysisStockInfo').style.display = 'none';
            document.getElementById('chartCard').style.display = 'none';
            document.getElementById('indicatorsGrid').style.display = 'none';
        } finally {
            showLoading(false);
        }
    }

    async function updateMAOverlays(data) {
        if (!data && currentAnalysisStock) {
            try {
                const histData = await StockAPI.fetchHistory(currentAnalysisStock, currentAnalysisRange);
                data = histData.history;
            } catch {
                return;
            }
        }
        if (!data) return;

        Charts.addMovingAverages(data, {
            ma5: document.getElementById('toggleMA5').checked,
            ma10: document.getElementById('toggleMA10').checked,
            ma20: document.getElementById('toggleMA20').checked,
            ma60: document.getElementById('toggleMA60').checked,
        });
    }

    // ============================
    // Signals Page
    // ============================

    function initSignalsPage() {
        // Refresh signals button
        document.getElementById('refreshSignalsBtn').addEventListener('click', () => {
            loadSignalsOverview(true);
        });
    }

    /**
     * Load signals overview for all tracked stocks
     */
    async function loadSignalsOverview(forceRefresh = false) {
        const symbols = Watchlist.getSymbols();
        const container = document.getElementById('signalsOverviewContent');

        if (symbols.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                    <p>尚未追蹤任何股票，請先到追蹤清單新增股票</p>
                    <button class="btn btn-primary btn-sm" data-page="watchlist">前往追蹤清單</button>
                </div>
            `;
            container.querySelectorAll('[data-page]').forEach(el => {
                el.addEventListener('click', () => navigateTo(el.getAttribute('data-page')));
            });
            initIcons();
            return;
        }

        // Show loading skeletons in grid
        container.innerHTML = `
            <div class="signals-card-grid">
                ${symbols.map(() => `
                    <div class="signal-overview-card skeleton" style="height: 180px;"></div>
                `).join('')}
            </div>
        `;

        try {
            // Fetch all data in parallel
            const results = await Promise.all(
                symbols.map(async (sym) => {
                    try {
                        const [quote, histData] = await Promise.all([
                            StockAPI.fetchQuote(sym),
                            StockAPI.fetchHistory(sym, '6mo'),
                        ]);
                        const analysis = Indicators.generateSignals(histData);
                        return { symbol: sym, quote, analysis, error: false };
                    } catch (err) {
                        return { symbol: sym, quote: null, analysis: null, error: true };
                    }
                })
            );

            // Render card grid
            container.innerHTML = `
                <div class="signals-card-grid">
                    ${results.map(r => {
                if (r.error || !r.quote || !r.analysis) {
                    return `
                        <div class="signal-overview-card" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)">
                            <div style="text-align:center">
                                <i data-lucide="alert-circle" style="opacity:0.5;margin-bottom:8px"></i>
                                <div>${r.symbol} 無法分析</div>
                            </div>
                        </div>
                    `;
                }

                const q = r.quote;
                const a = r.analysis;
                const isGain = q.changePercent >= 0;
                const colorClass = isGain ? 'gain' : 'loss';
                const arrow = isGain ? '▲' : '▼';

                // Score color
                let scoreColor = 'var(--text-primary)';
                if (a.overallScore >= 65) scoreColor = 'var(--gain)';
                else if (a.overallScore <= 35) scoreColor = 'var(--loss)';

                // RSI status
                const rsi = a.indicators.rsi;
                let rsiColor = 'var(--text-secondary)';
                if (rsi !== null) {
                    if (rsi > 70) rsiColor = 'var(--loss)';
                    else if (rsi < 30) rsiColor = 'var(--gain)';
                }

                return `
                        <div class="signal-overview-card signal-overview-row" data-symbol="${r.symbol}">
                            <div class="signal-card-header">
                                <div>
                                    <div style="font-weight:600;font-size:1.1rem">${q.name}</div>
                                    <div class="mono" style="color:var(--text-muted);font-size:0.85rem">${r.symbol}</div>
                                </div>
                                <div class="action-badge ${a.actionClass}" style="font-size:0.75rem;padding:4px 12px">${a.action}</div>
                            </div>
                            
                            <div style="display:flex;align-items:flex-end;gap:12px;margin-bottom:12px">
                                <span class="mono" style="font-size:1.5rem;font-weight:700">${q.price.toFixed(2)}</span>
                                <span class="mono ${colorClass}" style="font-size:0.85rem;margin-bottom:4px">${arrow} ${Math.abs(q.changePercent).toFixed(2)}%</span>
                            </div>

                            <div class="signal-card-metrics">
                                <div>
                                    <div style="font-size:0.75rem">評分</div>
                                    <div class="mono" style="color:${scoreColor};font-weight:700;font-size:1.1rem">${a.overallScore}</div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem">RSI</div>
                                    <div class="mono" style="color:${rsiColor}">${rsi !== null ? rsi.toFixed(1) : '--'}</div>
                                </div>
                                <div>
                                    <div style="font-size:0.75rem">MACD</div>
                                    <div class="mono">${a.indicators.macd.macd !== null ? a.indicators.macd.macd.toFixed(1) : '--'}</div>
                                </div>
                            </div>
                        </div>
                    `;
            }).join('')}
                </div>
            `;
            initIcons();

            // Bind card clicks
            container.querySelectorAll('.signal-overview-row').forEach(card => {
                card.addEventListener('click', () => {
                    // Update active state
                    container.querySelectorAll('.signal-overview-row').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');

                    loadSignals(card.dataset.symbol);
                });
            });

            // Bind Modal close
            const modal = document.getElementById('signalModal');
            const overlay = modal.querySelector('.modal-overlay');
            const closeBtn = document.getElementById('closeSignalModal');

            const closeModal = () => {
                modal.classList.remove('open');
                container.querySelectorAll('.signal-overview-row').forEach(c => c.classList.remove('active'));
            };

            overlay.addEventListener('click', closeModal);
            closeBtn.addEventListener('click', closeModal);

        } catch (err) {
            console.error('Signals overview error:', err);
            showToast('載入信號總覽失敗', 'error');
        }
    }

    async function loadSignals(symbol) {
        showLoading(true);
        const modal = document.getElementById('signalModal');

        try {
            const [quoteData, histData] = await Promise.all([
                StockAPI.fetchQuote(symbol),
                StockAPI.fetchHistory(symbol, '6mo'),
            ]);
            const analysis = Indicators.generateSignals(histData);

            // Stock info header
            document.getElementById('signalStockName').textContent = quoteData.name;
            document.getElementById('signalStockCode').textContent = quoteData.symbol;
            document.getElementById('signalStockPrice').textContent = quoteData.price.toFixed(2);
            const changeEl = document.getElementById('signalStockChange');
            const isGain = quoteData.changePercent >= 0;
            changeEl.textContent = `${isGain ? '+' : ''}${quoteData.change.toFixed(2)} (${isGain ? '+' : ''}${quoteData.changePercent.toFixed(2)}%)`;
            changeEl.className = `stock-change ${isGain ? 'gain' : 'loss'}`;

            // Overall score
            document.getElementById('overallScore').textContent = analysis.overallScore;

            // Score ring animation
            const ring = document.getElementById('scoreRing');
            const circumference = 2 * Math.PI * 50;
            const offset = circumference - (analysis.overallScore / 100) * circumference;
            ring.style.strokeDasharray = circumference;
            ring.style.strokeDashoffset = circumference;
            setTimeout(() => {
                ring.style.strokeDashoffset = offset;
            }, 100);

            // Action badge
            const badge = document.getElementById('actionBadge');
            badge.textContent = analysis.action;
            badge.className = `action-badge ${analysis.actionClass}`;

            // Signal table
            const tbody = document.getElementById('signalTableBody');
            tbody.innerHTML = analysis.signals.map(s => `
                <tr>
                    <td style="font-weight:600">${s.indicator}</td>
                    <td class="mono">${s.value}</td>
                    <td>
                        <span class="signal-dot ${s.signal}"></span>
                        <span class="${s.signal === 'buy' ? 'gain' : s.signal === 'sell' ? 'loss' : 'neutral-color'}">${s.label}</span>
                    </td>
                    <td style="color:var(--text-secondary);font-size:0.85rem">${s.description}</td>
                </tr>
            `).join('');

            // Risk meters
            const riskContainer = document.getElementById('riskMeters');
            const risk = analysis.risk;
            riskContainer.innerHTML = `
                <div class="risk-meter">
                    <span class="risk-meter-label">波動率</span>
                    <div class="risk-bar">
                        <div class="risk-bar-fill" style="width:${risk.volatility}%;background:${getRiskColor(risk.volatility)}"></div>
                    </div>
                    <span class="risk-value">${risk.volatility.toFixed(1)}%</span>
                </div>
                <div class="risk-meter">
                    <span class="risk-meter-label">趨勢強度</span>
                    <div class="risk-bar">
                        <div class="risk-bar-fill" style="width:${risk.trendStrength}%;background:${getTrendColor(risk.trendStrength)}"></div>
                    </div>
                    <span class="risk-value">${risk.trendStrength.toFixed(1)}</span>
                </div>
                <div class="risk-meter">
                    <span class="risk-meter-label">動能 (RSI)</span>
                    <div class="risk-bar">
                        <div class="risk-bar-fill" style="width:${risk.momentum}%;background:${getMomentumColor(risk.momentum)}"></div>
                    </div>
                    <span class="risk-value">${risk.momentum.toFixed(1)}</span>
                </div>
            `;

            // Show modal if success
            setTimeout(() => modal.classList.add('open'), 100);

        } catch (err) {
            console.error('Signals load error:', err);
            showToast(`無法載入 ${symbol} 的買賣建議`, 'error');
            modal.classList.remove('open');
        } finally {
            showLoading(false);
        }
    }

    function getRiskColor(value) {
        if (value < 20) return 'var(--gain)';
        if (value < 40) return '#22d3ee';
        if (value < 60) return 'var(--neutral)';
        if (value < 80) return '#f97316';
        return 'var(--loss)';
    }

    function getTrendColor(value) {
        if (value < 30) return 'var(--text-muted)';
        if (value < 60) return 'var(--accent-blue)';
        return 'var(--accent-purple)';
    }

    function getMomentumColor(value) {
        if (value < 30) return 'var(--gain)';
        if (value < 70) return 'var(--accent-blue)';
        return 'var(--loss)';
    }

    // ============================
    // Utilities
    // ============================

    function formatVolume(vol) {
        if (!vol) return '-';
        if (vol >= 100000000) return (vol / 100000000).toFixed(1) + ' 億';
        if (vol >= 10000) return (vol / 10000).toFixed(0) + ' 萬';
        if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
        return vol.toString();
    }

    function showLoading(show) {
        document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================
    // Boot
    // ============================

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        navigateTo,
        loadAnalysis,
        loadSignals,
        showToast,
    };
})();
