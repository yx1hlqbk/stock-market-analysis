# StockPulse — 智能股票追蹤與分析平台

[![GitHub Pages](https://img.shields.io/badge/🚀_線上體驗-GitHub_Pages-blue?style=for-the-badge)](https://yx1hlqbk.github.io/stock-market-analysis/)

> **👉 [點我立即開啟 StockPulse](https://yx1hlqbk.github.io/stock-market-analysis/)**

StockPulse 是一個基於純前端技術 (Vanilla JS, HTML, CSS) 打造的現代化股票分析介面。專注於台股資料的獲取、顯示及技術分析，提供流暢的卡片式設計、多項技術指標，以及自動化的買賣建議系統。

## ✨ 主要特色功能

1. **個人自選股儀表板**
   * 直覺的表格管理，輕鬆新增/刪除追蹤的股票。
   * 即時更新當前價格與漲跌幅度。
   * 完整的台股中文名稱對照。

2. **進階技術分析**
   * 整合 TradingView 的 Lightweight Charts 展現流暢的 K 線與成交量。
   * 自訂多區間範圍（3 個月、6 個月、1 年、2 年）。
   * 即時載入並繪製多重技術指標 (MA 均線、RSI、MACD、布林通道、KD、MA60)。

3. **自動化買賣建議 (Signals)**
   * **卡片網格化顯示**：一次預覽追蹤股票的核心指標與綜合評分。
   * **彈出式視窗 (Modal)**：點選卡片即可展開完整分析，一覽動能、趨勢與波動率。
   * 由內部演算法交叉比對六大技術指標，產生明確的操作建議（買進 / 加碼、續抱 / 觀望、減碼 / 賣出）。

## 🚀 技術棧與架構

* **純前端架構**：不依賴 Node.js、Webpack、Vite 等複雜的環境，所有代碼都是原生前端語法。
* **API 來源**：直接串接 **TWSE 臺灣證交所官方 API**，資料穩定可靠且完全免費。
* **圖表渲染**：
  * 主圖表：[Lightweight Charts](https://tradingview.github.io/lightweight-charts/) (K 線與報價)。
  * 指標圖：[Chart.js](https://www.chartjs.org/) (RSI、MACD 等趨勢圖)。
* **圖示系統**：[Lucide Icons](https://lucide.dev/) (輕量級 SVG 圖示)。

## 🌐 線上體驗

本專案已部署至 GitHub Pages，您可以直接點擊下方連結開始使用：

### 🔗 [https://yx1hlqbk.github.io/stock-market-analysis/](https://yx1hlqbk.github.io/stock-market-analysis/)

## 🛠️ 本地開發

如果想在本地端啟動：

```bash
# 下載專案
git clone https://github.com/yx1hlqbk/stock-market-analysis.git
cd stock-market-analysis

# 啟動本地伺服器
npx -y serve . -l 3000

# 開啟瀏覽器 http://localhost:3000
```

## 📌 注意事項

* 資料來源為 TWSE 臺灣證交所，僅支援**上市股票**。
* TWSE API 有請求頻率限制，系統已內建延遲機制避免被阻擋。
* 所有資料僅供參考，不構成投資建議。

---
*Developed with ❤️ by StockPulse Team*
