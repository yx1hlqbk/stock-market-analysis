/**
 * StockPulse — API Service Module
 * Handles all stock data fetching from Yahoo Finance
 */

const StockAPI = (() => {
    // Yahoo Finance API proxies (CORS-friendly) with failover
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url='
    ];
    const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance';

    // Cache for API responses
    const cache = new Map();
    const CACHE_TTL = Infinity; // Only cleared manually via clearCache()

    // Dynamic name cache for stocks not in the database
    const dynamicNameCache = new Map();

    // Load saved names from localStorage
    try {
        const saved = localStorage.getItem('stockpulse_name_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.entries(parsed).forEach(([k, v]) => dynamicNameCache.set(k, v));
        }
    } catch (e) { }

    /**
     * Convert Taiwan stock code to Yahoo symbol
     */
    function toYahooSymbol(code) {
        code = code.trim().toUpperCase();
        if (code.endsWith('.TW') || code.endsWith('.TWO')) return code;

        // If it's a number, default to .TW. fetch operations will retry with .TWO if needed.
        if (/^\d{4,6}$/.test(code)) return code + '.TW';
        return code;
    }

    /**
     * Get cached data or null
     */
    function getCache(key) {
        const item = cache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > CACHE_TTL) {
            cache.delete(key);
            return null;
        }
        return item.data;
    }

    /**
     * Set cache data
     */
    function setCache(key, data) {
        cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Fetch with CORS proxy rotation
     */
    async function fetchWithProxy(url) {
        let lastError = null;
        for (const proxyBase of CORS_PROXIES) {
            try {
                const proxyUrl = proxyBase + encodeURIComponent(url);
                const resp = await fetch(proxyUrl);
                if (!resp.ok) throw new Error(`API error HTTP ${resp.status}`);
                return await resp.json();
            } catch (err) {
                console.warn(`Proxy ${proxyBase} failed:`, err);
                lastError = err;
            }
        }
        throw new Error(`All CORS proxies failed. Last error: ${lastError.message}`);
    }

    /**
     * Fetch quote for a single stock
     */
    async function fetchQuote(symbol) {
        const originalCode = symbol.replace('.TW', '').replace('.TWO', '');
        let yahooSym = toYahooSymbol(symbol);

        let cacheKey = `quote_${originalCode}`;
        let cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            let url = `${YAHOO_BASE}/chart/${yahooSym}?interval=1d&range=5d`;
            let data;
            try {
                data = await fetchWithProxy(url);
            } catch (err) {
                // If failed and it was a default .TW guess, try .TWO
                if (yahooSym.endsWith('.TW') && !symbol.endsWith('.TW')) {
                    const tryTwo = yahooSym.replace('.TW', '.TWO');
                    url = `${YAHOO_BASE}/chart/${tryTwo}?interval=1d&range=5d`;
                    data = await fetchWithProxy(url);
                    yahooSym = tryTwo;
                } else {
                    throw err;
                }
            }

            const result = data.chart.result[0];
            const meta = result.meta;
            const quotes = result.indicators.quote[0];
            const len = result.timestamp.length;
            const lastIdx = len - 1;

            // Resolve proper name
            let stockName = getStockName(symbol);
            if (stockName === originalCode) {
                // Not in our custom dynamic cache yet, let's look up the static dictionary
                if (typeof TAIWAN_STOCK_NAMES !== 'undefined' && TAIWAN_STOCK_NAMES[originalCode]) {
                    stockName = TAIWAN_STOCK_NAMES[originalCode];
                    saveStockName(originalCode, stockName);
                } else {
                    // Fallback to Yahoo API name
                    stockName = meta.shortName || meta.longName || originalCode;
                    saveStockName(originalCode, stockName);
                }
            }

            const quote = {
                symbol: originalCode,
                yahooSymbol: yahooSym,
                name: stockName,
                price: meta.regularMarketPrice,
                previousClose: meta.chartPreviousClose || meta.previousClose,
                change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose),
                changePercent: ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose)) / (meta.chartPreviousClose || meta.previousClose) * 100),
                volume: quotes.volume ? quotes.volume[lastIdx] : 0,
                high: quotes.high ? quotes.high[lastIdx] : meta.regularMarketPrice,
                low: quotes.low ? quotes.low[lastIdx] : meta.regularMarketPrice,
                open: quotes.open ? quotes.open[lastIdx] : meta.regularMarketPrice,
                currency: meta.currency,
                exchange: meta.exchangeName,
                timestamp: meta.regularMarketTime,
            };

            setCache(cacheKey, quote);
            return quote;
        } catch (err) {
            console.error(`Failed to fetch quote for ${symbol}:`, err);
            throw err;
        }
    }

    /**
     * Fetch historical data for analysis
     */
    async function fetchHistory(symbol, range = '6mo', interval = '1d') {
        const originalCode = symbol.replace('.TW', '').replace('.TWO', '');
        let yahooSym = toYahooSymbol(symbol);

        let cacheKey = `history_${originalCode}_${range}_${interval}`;
        let cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            let url = `${YAHOO_BASE}/chart/${yahooSym}?interval=${interval}&range=${range}`;
            let data;
            try {
                data = await fetchWithProxy(url);
            } catch (err) {
                // Try .TWO fallback
                if (yahooSym.endsWith('.TW') && !symbol.endsWith('.TW')) {
                    const tryTwo = yahooSym.replace('.TW', '.TWO');
                    url = `${YAHOO_BASE}/chart/${tryTwo}?interval=${interval}&range=${range}`;
                    data = await fetchWithProxy(url);
                    yahooSym = tryTwo;
                } else {
                    throw err;
                }
            }
            const result = data.chart.result[0];
            const quotes = result.indicators.quote[0];
            const timestamps = result.timestamp;

            const history = timestamps.map((ts, i) => ({
                time: formatDate(ts),
                timestamp: ts,
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: quotes.close[i],
                volume: quotes.volume[i],
            })).filter(d => d.open !== null && d.close !== null);

            const resultData = {
                symbol,
                yahooSymbol: yahooSym,
                name: getStockName(symbol),
                history,
                meta: result.meta,
            };

            setCache(cacheKey, resultData);
            return resultData;
        } catch (err) {
            console.error(`Failed to fetch history for ${symbol}:`, err);
            throw err;
        }
    }

    /**
     * Search stocks by keyword
     * (We no longer use local DB to filter. This will just act as a proxy passing the keyword)
     */
    async function searchStock(keyword) {
        keyword = keyword.trim().toUpperCase();
        if (!keyword) return [];

        // We just return a single item allowing the user to click and verify via API
        return [{
            symbol: keyword,
            name: "搜尋並驗證代碼...",
            industry: "API 查詢"
        }];
    }

    /**
     * Get stock name from dynamic cache
     */
    function getStockName(symbol) {
        const code = symbol.replace('.TW', '').replace('.TWO', '').trim();
        const fromCache = dynamicNameCache.get(code);
        if (fromCache) return fromCache;
        return code;
    }

    /**
     * Save a stock name to the dynamic cache
     */
    function saveStockName(symbol, name) {
        const code = symbol.replace('.TW', '').replace('.TWO', '').trim();
        if (!name || name === code) return;
        dynamicNameCache.set(code, name);
        // Persist to localStorage
        try {
            const obj = {};
            dynamicNameCache.forEach((v, k) => obj[k] = v);
            localStorage.setItem('stockpulse_name_cache', JSON.stringify(obj));
        } catch (e) { }
    }

    /**
     * Format Unix timestamp to YYYY-MM-DD
     */
    function formatDate(timestamp) {
        const d = new Date(timestamp * 1000);
        return d.toISOString().split('T')[0];
    }

    /**
     * Fetch multiple quotes SEQUENTIALLY with delay to avoid rate limits
     */
    async function fetchMultipleQuotes(symbols) {
        const results = [];
        for (let i = 0; i < symbols.length; i++) {
            try {
                const quote = await fetchQuote(symbols[i]);
                results.push(quote);
            } catch (e) {
                console.warn(`Quote for ${symbols[i]} failed:`, e);
            }
            // Wait 300ms between requests to avoid rate limiting
            if (i < symbols.length - 1) {
                await new Promise(r => setTimeout(r, 300));
            }
        }
        return results;
    }

    return {
        fetchQuote,
        fetchHistory,
        searchStock,
        fetchMultipleQuotes,
        getStockName,
        saveStockName,
        toYahooSymbol,
        clearCache: () => cache.clear()
    };
})();
