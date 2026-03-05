/**
 * StockPulse — API Service Module
 * 直接在瀏覽器端呼叫 TWSE 臺灣證交所官方 API
 * 若遇 CORS 限制，自動透過 allorigins 代理（TWSE 資料量小，代理非常穩定）
 */

const StockAPI = (() => {
    // TWSE 基礎位址
    const TWSE_BASE = 'https://www.twse.com.tw/exchangeReport/STOCK_DAY';

    // Cache（永久，只透過手動清除）
    const cache = new Map();

    // 名稱快取
    const dynamicNameCache = new Map();
    try {
        const saved = localStorage.getItem('stockpulse_name_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.entries(parsed).forEach(([k, v]) => dynamicNameCache.set(k, v));
        }
    } catch (e) { }

    // ---------- Helpers ----------

    function cleanSymbol(symbol) {
        return symbol.replace('.TW', '').replace('.TWO', '').trim();
    }

    function toYahooSymbol(code) {
        return cleanSymbol(code);
    }

    /** 民國年 "114/03/05" → Date */
    function parseROCDate(rocDateStr) {
        const parts = rocDateStr.trim().split('/');
        const year = parseInt(parts[0], 10) + 1911;
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return new Date(year, month - 1, day);
    }

    /** 移除千分位逗號，轉為數字 */
    function parseNumber(str) {
        if (!str || str === '--' || str === 'X') return null;
        return parseFloat(str.replace(/,/g, ''));
    }

    function getCache(key) {
        const item = cache.get(key);
        if (!item) return null;
        return item.data;
    }

    function setCache(key, data) {
        cache.set(key, { data, timestamp: Date.now() });
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /**
     * 呼叫 TWSE API（先直接呼叫，若 CORS 擋住則走 allorigins 代理）
     */
    async function fetchTWSE(url) {
        // 策略 1：直接呼叫（部分環境可能允許 CORS）
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (data.stat === 'OK') return data;
            }
        } catch (e) {
            // CORS blocked — fallback to proxy
        }

        // 策略 2：allorigins JSON wrapper（TWSE 資料量小，非常穩定）
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const resp = await fetch(proxyUrl);
            if (!resp.ok) throw new Error(`Proxy HTTP ${resp.status}`);
            const wrapper = await resp.json();
            if (!wrapper.contents) throw new Error('empty contents');
            const data = JSON.parse(wrapper.contents);
            if (data.stat === 'OK') return data;
            throw new Error(`TWSE stat: ${data.stat}`);
        } catch (e) {
            // 策略 2 失敗
        }

        // 策略 3：allorigins raw
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const resp = await fetch(proxyUrl);
            if (!resp.ok) throw new Error(`Raw proxy HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.stat === 'OK') return data;
            throw new Error(`TWSE stat: ${data.stat}`);
        } catch (e) {
            // 全部失敗
        }

        throw new Error('無法取得 TWSE 資料');
    }

    /**
     * 取得某個月的 TWSE STOCK_DAY 資料
     */
    async function fetchMonthData(stockNo, dateStr) {
        const url = `${TWSE_BASE}?response=json&date=${dateStr}&stockNo=${stockNo}`;
        return fetchTWSE(url);
    }

    // ---------- Public API ----------

    /**
     * 取得個股報價（讀取當月 TWSE 最後一筆收盤資料）
     */
    async function fetchQuote(symbol) {
        const code = cleanSymbol(symbol);
        const cacheKey = `quote_${code}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}01`;
        const data = await fetchMonthData(code, dateStr);

        if (!data.data || data.data.length === 0) {
            throw new Error('查無資料');
        }

        const last = data.data[data.data.length - 1];
        const prev = data.data.length > 1 ? data.data[data.data.length - 2] : null;

        // fields: 日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數
        const close = parseNumber(last[6]);
        const prevClose = prev ? parseNumber(prev[6]) : close;
        const change = close - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

        // 從 title 取得中文名稱
        let name = code;
        if (data.title) {
            const match = data.title.match(/\d+\s+(\S+)/);
            if (match) name = match[1];
        }
        if (name !== code) saveStockName(code, name);

        const quote = {
            symbol: code,
            yahooSymbol: code,
            name: name || getStockName(code),
            price: close,
            previousClose: prevClose,
            change,
            changePercent,
            volume: parseNumber(last[1]),
            high: parseNumber(last[4]),
            low: parseNumber(last[5]),
            open: parseNumber(last[3]),
            currency: 'TWD',
            exchange: 'TWSE',
            timestamp: Math.floor(parseROCDate(last[0]).getTime() / 1000),
        };

        setCache(cacheKey, quote);
        return quote;
    }

    /**
     * 取得歷史 K 線資料（逐月抓取 TWSE，附帶延遲防止限流）
     */
    async function fetchHistory(symbol, range = '3mo') {
        const code = cleanSymbol(symbol);
        const months = range === '6mo' ? 6 : range === '1y' ? 12 : 3;
        const cacheKey = `history_${code}_${range}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        const now = new Date();
        const allHistory = [];
        let stockName = getStockName(code);

        // 逐月取得（從最早的月份開始）
        for (let i = months - 1; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}01`;

            try {
                const data = await fetchMonthData(code, dateStr);

                // 取得名稱
                if (data.title) {
                    const match = data.title.match(/\d+\s+(\S+)/);
                    if (match) {
                        stockName = match[1];
                        saveStockName(code, stockName);
                    }
                }

                if (data.data) {
                    for (const row of data.data) {
                        const d = parseROCDate(row[0]);
                        allHistory.push({
                            time: d.toISOString().split('T')[0],
                            timestamp: Math.floor(d.getTime() / 1000),
                            open: parseNumber(row[3]),
                            high: parseNumber(row[4]),
                            low: parseNumber(row[5]),
                            close: parseNumber(row[6]),
                            volume: parseNumber(row[1]),
                        });
                    }
                }
            } catch (e) {
                console.warn(`TWSE ${code} ${dateStr} 取得失敗:`, e.message);
            }

            // TWSE 有頻率限制，每月之間等待 600ms
            if (i > 0) await sleep(600);
        }

        const history = allHistory.filter(d => d.open !== null && d.close !== null);

        const resultData = {
            symbol: code,
            yahooSymbol: code,
            name: stockName,
            history,
            meta: {
                regularMarketPrice: history.length ? history[history.length - 1].close : 0,
                chartPreviousClose: history.length > 1 ? history[history.length - 2].close : 0,
            },
        };

        setCache(cacheKey, resultData);
        return resultData;
    }

    // ---------- 搜尋 & 名稱 ----------

    async function searchStock(keyword) {
        keyword = keyword.trim().toUpperCase();
        if (!keyword) return [];
        return [{
            symbol: keyword,
            name: '搜尋並驗證代碼...',
            industry: 'TWSE 查詢'
        }];
    }

    function getStockName(symbol) {
        const code = cleanSymbol(symbol);
        const fromCache = dynamicNameCache.get(code);
        if (fromCache) return fromCache;
        if (typeof TAIWAN_STOCK_NAMES !== 'undefined' && TAIWAN_STOCK_NAMES[code]) {
            return TAIWAN_STOCK_NAMES[code];
        }
        return code;
    }

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
     * 批次取得報價（依序，每筆間隔 600ms）
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
            if (i < symbols.length - 1) await sleep(600);
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
