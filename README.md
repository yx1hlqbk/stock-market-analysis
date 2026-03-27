# StockPulse — 智能股票追蹤與分析平台

StockPulse 是基於 **Nuxt 3 + Vue 3** 打造的現代化台股分析平台。提供即時報價、K 線圖、技術指標與自動化買賣建議。

## 主要功能

1. **個人自選股儀表板** — 新增/刪除追蹤股票，即時更新價格與漲跌幅
2. **進階技術分析** — K 線圖、MA 均線、RSI、MACD、布林通道、KD 指標
3. **自動化買賣建議** — 六大指標交叉比對，產生綜合評分與操作建議

## 技術架構

| 層級 | 技術 |
|------|------|
| 框架 | Nuxt 3 (Vue 3 Composition API) |
| 路由 | Vue Router (檔案式路由) |
| 狀態管理 | Composables + useState |
| API 代理 | Nuxt Server Routes (零 CORS 問題) |
| 資料來源 | TWSE 臺灣證交所官方 API |
| 圖表 | [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) |
| 圖示 | [Lucide Vue Next](https://lucide.dev/) |
| 樣式 | 深色主題 Glassmorphism + RWD |

## 專案結構

```
├── pages/              # 頁面 (儀表板、技術分析、買賣建議)
├── components/         # Vue 元件 (Sidebar、Topbar、Modal 等)
├── composables/        # 共用邏輯 (API、指標計算、圖表、自選股)
├── server/api/         # Nuxt Server Routes (TWSE API 代理)
├── layouts/            # 佈局
├── plugins/            # Lucide 圖示註冊
├── data/               # 台股代碼名稱對照表
└── assets/css/         # 全域樣式
```

## 本地開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 正式建置
npm run build

# 預覽建置結果
npm run preview
```

## 注意事項

- 資料來源為 TWSE 臺灣證交所，僅支援**上市股票**
- TWSE API 有請求頻率限制，系統已內建延遲機制避免被阻擋
- 所有資料僅供參考，不構成投資建議
