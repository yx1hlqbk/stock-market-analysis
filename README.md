# StockPulse — 智能股票追蹤與分析平台

StockPulse 是一個基於純前端技術 (Vanilla JS, HTML, CSS) 打造的現代化股票分析介面。這款應用專注於台股資料的獲取、顯示及技術分析，提供流暢的卡片式設計、多項技術指標，以及自動化的買賣建議系統。

## ✨ 主要特色功能

1. **個人自選股儀表板**
   * 直覺的表格管理，輕鬆新增/刪除追蹤的股票。
   * 即時更新當前價格與漲跌幅度。
   * 內建台股代碼與名稱關聯 (儲存於 `data/tw_stocks.json`)。

2. **進階技術分析**
   * 整合 TradingView 的 Lightweight Charts 技術展現流暢的 K 線與成交量。
   * 自訂多區間範圍（3個月、6個月、1年、2年）。
   * 即時載入並繪製多重技術指標 (MA 均線、RSI、MACD、布林通道)。

3. **自動化買賣建議 (Signals)**
   * **卡片網格化顯示**：在買賣建議頁可以一次預覽追蹤股票的核心指標狀況與綜合評分。
   * **彈出式視窗 (Modal)**：點選卡片即可召喚分析視窗，一覽動能、趨勢與波動率等各項參數背後的隱藏風險。
   * 由內部演算法交叉比對技術指標以產生（強烈買入 / 買入 / 建議持有 / 賣出）評級。

## 🚀 技術棧與架構

* **無需建置工具**：不依賴 Node.js, Webpack, Vite 等複雜的環境，所有代碼都是純粹的原生前端語法 (Vanilla JS, CSS Variables, Flexbox)。
* **API 來源**：利用 `corsproxy.io` 作為中介串接 **Yahoo Finance API (v8)** 取得台股歷史與盤中報價。
* **圖表渲染**：
  * 主圖表：[Lightweight Charts](https://tradingview.github.io/lightweight-charts/) (負責 K線與報價)。
  * 指標圖：[Chart.js](https://www.chartjs.org/) (負責繪製 RSI, MACD 等趨勢圖)。
* **圖示系統**：[Lucide Icons](https://lucide.dev/) (輕量級 SVG 圖示)。
* **靜態資料庫**：利用 `data/tw_stocks.json` 作為台股簡易查詢的支援。

## 🛠️ GitHub Pages 部署與觀看

由於專案完全不包含後端程式碼，你可以**直接用 GitHub Pages** 免費將它變成一個線上網站，供隨時察看。

### 如何啟用 GitHub Pages：
1. 將這包程式碼 push 上到您的 GitHub 儲存庫 (例如 `https://github.com/yx1hlqbk/stock-analysis.git`)。
2. 開啟您的 GitHub 專案頁面，點選上方的 **Settings** 標籤。
3. 在左側選單中找到 **Pages** (通常在 Code and automation 分類下)。
4. 在 *Build and deployment* 區塊：
   * Source 選擇 **Deploy from a branch**。
   * Branch 選擇 `main` (或是您的主分支名稱) 和 `/ (root)`。
5. 點擊 **Save**。
6. 等待數分鐘後，重新整理此頁，頁面上方會出現連結 `Your site is live at https://yx1hlqbk.github.io/stock-analysis/`。
7. 分享此連結，你與朋友即可隨時上站分析股票！

*(註：由於部分免費 CORS Proxy 在大量請求時可能會有穩定的限制，建議未來上線成正式產品時替換為自己的後端 Proxy)*

---
*Developed by Antigravity*
