/**
 * StockPulse — API Service Module
 * Handles all stock data fetching from Yahoo Finance
 */

const StockAPI = (() => {
    // Yahoo Finance API proxy (CORS-friendly)
    const CORS_PROXY = 'https://corsproxy.io/?';
    const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance';

    // Cache for API responses
    const cache = new Map();
    const CACHE_TTL = 60000; // 1 minute

    // TWSE / TPEx Open API URLs
    const TWSE_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
    const TPEX_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes';

    // In-memory cache for all Taiwan stock names fetched from Open APIs
    let openApiNames = null;

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
     * Pre-fetch and cache all Taiwan stock names from Open APIs
     */
    async function fetchAllTaiwanStockNames() {
        if (openApiNames) return openApiNames;
        openApiNames = new Map();

        try {
            // Fetch TWSE (上市)
            const twseRes = await fetch(TWSE_URL);
            if (twseRes.ok) {
                const twseData = await twseRes.json();
                twseData.forEach(item => {
                    openApiNames.set(item.Code, item.Name);
                });
            }

            // Fetch TPEx (上櫃)
            const tpexRes = await fetch(TPEX_URL);
            if (tpexRes.ok) {
                const tpexData = await tpexRes.json();
                tpexData.forEach(item => {
                    openApiNames.set(item.SecuritiesCompanyCode, item.CompanyName);
                });
            }
        } catch (e) {
            console.error('Error fetching Taiwan stock APIs for names', e);
        }

        return openApiNames;
    }

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
     * Fetch with CORS proxy
     */
    async function fetchWithProxy(url) {
        const proxyUrl = CORS_PROXY + encodeURIComponent(url);
        const resp = await fetch(proxyUrl);
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        return resp.json();
    }

    /**
     * Fetch quote for a single stock
     */
    async function fetchQuote(symbol) {
        const originalCode = symbol.replace('.TW', '').replace('.TWO', '');
        let yahooSym = toYahooSymbol(symbol);

        let cacheKey = `quote_${yahooSym}`;
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
                    cacheKey = `quote_${yahooSym}`;
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
                // Not in our custom dynamic cache yet, let's query Open APIs
                await fetchAllTaiwanStockNames();
                if (openApiNames && openApiNames.has(originalCode)) {
                    stockName = openApiNames.get(originalCode);
                    saveStockName(originalCode, stockName);
                } else {
                    // Fallback to Yahoo API name if Open API fails
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
        let yahooSym = toYahooSymbol(symbol);
        let cacheKey = `history_${yahooSym}_${range}_${interval}`;
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
                    cacheKey = `history_${yahooSym}_${range}_${interval}`;
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
     * Fetch multiple quotes in parallel
     */
    async function fetchMultipleQuotes(symbols) {
        const promises = symbols.map(s => fetchQuote(s).catch(() => null));
        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    }

    return {
        fetchQuote,
        fetchHistory,
        searchStock,
        fetchMultipleQuotes,
        getStockName,
        saveStockName,
        toYahooSymbol
    };
})();
