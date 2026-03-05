/**
 * StockPulse — API Service Module
 * 呼叫自家 Express 後端伺服器（串接 TWSE 臺灣證交所官方 API）
 */

const StockAPI = (() => {
    // 後端 API 基礎位址
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : 'http://localhost:3001'; // 如需部署到雲端，請改為正式網址

    // Cache for API responses (永久快取，只透過手動清除)
    const cache = new Map();

    // 股票名稱字典
    const dynamicNameCache = new Map();
    try {
        const saved = localStorage.getItem('stockpulse_name_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.entries(parsed).forEach(([k, v]) => dynamicNameCache.set(k, v));
        }
    } catch (e) { }

    /**
     * 清除代號格式
     */
    function cleanSymbol(symbol) {
        return symbol.replace('.TW', '').replace('.TWO', '').trim();
    }

    /**
     * Yahoo 符號格式轉換（保留相容性）
     */
    function toYahooSymbol(code) {
        return cleanSymbol(code);
    }

    /**
     * Get cached data
     */
    function getCache(key) {
        const item = cache.get(key);
        if (!item) return null;
        return item.data;
    }

    /**
     * Set cache data
     */
    function setCache(key, data) {
        cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * 取得個股報價
     */
    async function fetchQuote(symbol) {
        const code = cleanSymbol(symbol);
        const cacheKey = `quote_${code}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        const resp = await fetch(`${API_BASE}/api/quote/${code}`);
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        const data = await resp.json();

        // 更新名稱快取
        if (data.name && data.name !== code) {
            saveStockName(code, data.name);
        }

        // 同步靜態字典名稱（如果 API 只回傳代號）
        if (data.name === code && typeof TAIWAN_STOCK_NAMES !== 'undefined' && TAIWAN_STOCK_NAMES[code]) {
            data.name = TAIWAN_STOCK_NAMES[code];
            saveStockName(code, data.name);
        }

        const quote = {
            symbol: code,
            yahooSymbol: code,
            name: data.name || getStockName(code),
            price: data.price,
            previousClose: data.previousClose,
            change: data.change,
            changePercent: data.changePercent,
            volume: data.volume,
            high: data.high,
            low: data.low,
            open: data.open,
            currency: 'TWD',
            exchange: 'TWSE',
            timestamp: Date.now() / 1000,
        };

        setCache(cacheKey, quote);
        return quote;
    }

    /**
     * 取得歷史 K 線資料
     */
    async function fetchHistory(symbol, range = '3mo') {
        const code = cleanSymbol(symbol);
        const months = range === '6mo' ? 6 : range === '1y' ? 12 : 3;
        const cacheKey = `history_${code}_${range}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        const resp = await fetch(`${API_BASE}/api/history/${code}?months=${months}`);
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        const data = await resp.json();

        // 更新名稱
        if (data.name && data.name !== code) {
            saveStockName(code, data.name);
        }

        const resultData = {
            symbol: code,
            yahooSymbol: code,
            name: data.name || getStockName(code),
            history: data.history || [],
            meta: {
                regularMarketPrice: data.history?.length ? data.history[data.history.length - 1].close : 0,
                chartPreviousClose: data.history?.length > 1 ? data.history[data.history.length - 2].close : 0,
            },
        };

        setCache(cacheKey, resultData);
        return resultData;
    }

    /**
     * 搜尋股票
     */
    async function searchStock(keyword) {
        keyword = keyword.trim().toUpperCase();
        if (!keyword) return [];
        return [{
            symbol: keyword,
            name: '搜尋並驗證代碼...',
            industry: 'TWSE 查詢'
        }];
    }

    /**
     * 取得股票名稱
     */
    function getStockName(symbol) {
        const code = cleanSymbol(symbol);
        const fromCache = dynamicNameCache.get(code);
        if (fromCache) return fromCache;
        if (typeof TAIWAN_STOCK_NAMES !== 'undefined' && TAIWAN_STOCK_NAMES[code]) {
            return TAIWAN_STOCK_NAMES[code];
        }
        return code;
    }

    /**
     * 儲存股票名稱
     */
    function saveStockName(symbol, name) {
        const code = cleanSymbol(symbol);
        if (!name || name === code) return;
        dynamicNameCache.set(code, name);
        try {
            const obj = {};
            dynamicNameCache.forEach((v, k) => obj[k] = v);
            localStorage.setItem('stockpulse_name_cache', JSON.stringify(obj));
        } catch (e) { }
    }

    /**
     * 批次取得報價（依序，每筆間隔 300ms）
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
