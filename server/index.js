/**
 * StockPulse API Server
 * 使用 TWSE 臺灣證交所官方 API 取得股票資料
 */
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ---------- Helper ----------

/**
 * 延遲 ms 毫秒
 */
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * 民國年日期字串 → JS Date
 * e.g. "114/03/05" → Date(2025-03-05)
 */
function parseROCDate(rocDateStr) {
    const parts = rocDateStr.trim().split('/');
    const year = parseInt(parts[0], 10) + 1911;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return new Date(year, month - 1, day);
}

/**
 * 移除千分位逗號並轉為數字
 */
function parseNumber(str) {
    if (!str || str === '--' || str === 'X') return null;
    return parseFloat(str.replace(/,/g, ''));
}

/**
 * 取得指定月份的 TWSE STOCK_DAY 資料
 * @param {string} stockNo  e.g. "2330"
 * @param {string} dateStr  e.g. "20250301"
 */
async function fetchTWSEMonthData(stockNo, dateStr) {
    const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${stockNo}`;
    const resp = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
        }
    });
    if (!resp.ok) throw new Error(`TWSE HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.stat !== 'OK') throw new Error(`TWSE stat: ${data.stat}`);
    return data;
}

// ---------- API Routes ----------

/**
 * GET /api/quote/:symbol
 * 取得最新報價（使用 TWSE 每日收盤行情的最後一筆）
 */
app.get('/api/quote/:symbol', async (req, res) => {
    try {
        const stockNo = req.params.symbol.replace('.TW', '').replace('.TWO', '').trim();
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}01`;

        const data = await fetchTWSEMonthData(stockNo, dateStr);

        if (!data.data || data.data.length === 0) {
            return res.status(404).json({ error: '查無資料' });
        }

        // 取最後一筆（最近的交易日）
        const last = data.data[data.data.length - 1];
        const prev = data.data.length > 1 ? data.data[data.data.length - 2] : null;

        // fields: 日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數
        const close = parseNumber(last[6]);
        const prevClose = prev ? parseNumber(prev[6]) : close;
        const change = close - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

        // 從 title 取得股票名稱
        let name = stockNo;
        if (data.title) {
            const match = data.title.match(/\d+\s+(\S+)/);
            if (match) name = match[1];
        }

        res.json({
            symbol: stockNo,
            name,
            price: close,
            open: parseNumber(last[3]),
            high: parseNumber(last[4]),
            low: parseNumber(last[5]),
            close: close,
            previousClose: prevClose,
            change,
            changePercent,
            volume: parseNumber(last[1]),
            date: parseROCDate(last[0]).toISOString().split('T')[0],
        });
    } catch (err) {
        console.error('Quote error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/history/:symbol?months=3
 * 取得歷史 K 線資料（預設 3 個月）
 */
app.get('/api/history/:symbol', async (req, res) => {
    try {
        const stockNo = req.params.symbol.replace('.TW', '').replace('.TWO', '').trim();
        const months = parseInt(req.query.months) || 3;
        const now = new Date();

        const allHistory = [];
        let stockName = stockNo;

        // 逐月取得資料（從最早的月份開始）
        for (let i = months - 1; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}01`;

            try {
                const data = await fetchTWSEMonthData(stockNo, dateStr);

                // 從 title 取得名稱
                if (data.title) {
                    const match = data.title.match(/\d+\s+(\S+)/);
                    if (match) stockName = match[1];
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
                console.warn(`Month ${dateStr} fetch failed:`, e.message);
            }

            // TWSE 有請求頻率限制，每月資料之間等待 500ms
            if (i > 0) await sleep(500);
        }

        // 過濾掉無效資料
        const history = allHistory.filter(d => d.open !== null && d.close !== null);

        res.json({
            symbol: stockNo,
            name: stockName,
            history,
        });
    } catch (err) {
        console.error('History error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 健康檢查
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', source: 'TWSE 臺灣證交所' });
});

// ---------- Start ----------

app.listen(PORT, () => {
    console.log(`\n🚀 StockPulse API Server 啟動成功！`);
    console.log(`   資料來源：TWSE 臺灣證交所官方 API`);
    console.log(`   監聽端口：http://localhost:${PORT}`);
    console.log(`   報價 API：http://localhost:${PORT}/api/quote/2330`);
    console.log(`   歷史 API：http://localhost:${PORT}/api/history/2330?months=3\n`);
});
