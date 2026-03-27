<template>
  <section class="page active">
    <div class="page-header">
      <h1>技術分析</h1>
      <p class="page-subtitle">深入研究股票走勢與技術指標</p>
    </div>

    <div class="analysis-toolbar">
      <div class="input-group">
        <IconSearch class="input-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="form-input"
          placeholder="輸入股票代碼進行分析..."
          autocomplete="off"
          @input="onSearch"
          @keydown.enter="onSearchEnter"
        />
        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="stock in searchResults"
            :key="stock.symbol"
            class="search-result-item"
            @click="onSelectStock(stock)"
          >
            <div>
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <span class="stock-name" style="margin-left: 8px;">{{ stock.name }}</span>
            </div>
            <span class="stock-name">{{ stock.industry }}</span>
          </div>
        </div>
      </div>
      <div class="period-selector">
        <button
          v-for="p in periods"
          :key="p.value"
          class="period-btn"
          :class="{ active: currentRange === p.value }"
          @click="changeRange(p.value)"
        >{{ p.label }}</button>
      </div>
    </div>

    <!-- Stock Info -->
    <div v-if="quoteData" class="analysis-stock-info card">
      <div class="stock-info-header">
        <div class="stock-info-left">
          <h2>{{ quoteData.name }}</h2>
          <span class="stock-code">{{ quoteData.symbol }}</span>
        </div>
        <div class="stock-info-center">
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">系統評分與建議</span>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="mono" :style="{ fontWeight: 700, fontSize: '1.5rem', color: scoreColor }">
              {{ analysis?.overallScore ?? '--' }}
            </span>
            <span class="action-badge" :class="analysis?.actionClass || ''">
              {{ analysis?.action ?? '--' }}
            </span>
          </div>
        </div>
        <div class="stock-info-right">
          <span class="stock-price">{{ quoteData.price?.toFixed(2) }}</span>
          <span class="stock-change" :class="quoteData.changePercent >= 0 ? 'gain' : 'loss'">
            {{ quoteData.changePercent >= 0 ? '+' : '' }}{{ quoteData.change?.toFixed(2) }}
            ({{ quoteData.changePercent >= 0 ? '+' : '' }}{{ quoteData.changePercent?.toFixed(2) }}%)
          </span>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div v-if="historyData" class="card chart-card">
      <div class="card-header">
        <h3>K 線圖與均線</h3>
        <div class="chart-controls">
          <label class="toggle-label"><input type="checkbox" v-model="maOptions.ma5" @change="updateMA"> MA5</label>
          <label class="toggle-label"><input type="checkbox" v-model="maOptions.ma10" @change="updateMA"> MA10</label>
          <label class="toggle-label"><input type="checkbox" v-model="maOptions.ma20" @change="updateMA"> MA20</label>
          <label class="toggle-label"><input type="checkbox" v-model="maOptions.ma60" @change="updateMA"> MA60</label>
        </div>
      </div>
      <div class="card-body">
        <div ref="candlestickEl" class="chart-container"></div>
        <div ref="volumeEl" class="volume-chart-container"></div>
      </div>
    </div>

    <!-- Indicator Charts -->
    <div v-if="historyData" class="indicators-grid">
      <div class="card indicator-card">
        <div class="card-header">
          <h3>RSI (14)</h3>
          <span class="indicator-value">{{ rsiValue ?? '--' }}</span>
        </div>
        <div class="card-body">
          <div ref="rsiEl" class="indicator-chart-container"></div>
        </div>
      </div>
      <div class="card indicator-card">
        <div class="card-header">
          <h3>MACD (12,26,9)</h3>
          <span class="indicator-value">{{ macdValue ?? '--' }}</span>
        </div>
        <div class="card-body">
          <div ref="macdEl" class="indicator-chart-container"></div>
        </div>
      </div>
      <div class="card indicator-card full-width">
        <div class="card-header">
          <h3>布林通道 (20,2)</h3>
          <span class="indicator-value">{{ bollingerValue ?? '--' }}</span>
        </div>
        <div class="card-body">
          <div ref="bollingerEl" class="indicator-chart-container"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!quoteData && !loadingAnalysis" class="analysis-empty">
      <div class="empty-state large">
        <IconCandlestickChart :size="64" :stroke-width="1.5" style="opacity:0.4;margin-bottom:16px" />
        <h3>選擇一檔股票開始分析</h3>
        <p>在上方搜尋欄輸入股票代碼，即可查看 K 線圖、技術指標與趨勢分析</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import * as LightweightCharts from 'lightweight-charts'

const route = useRoute()
const api = useApi()
const indicators = useIndicators()
const charts = useCharts()
const { showToast } = useToast()
const loadingState = useState('loading', () => false)

const searchQuery = ref('')
const searchResults = ref([])
const currentRange = ref('3mo')
const currentSymbol = ref(null)
const quoteData = ref(null)
const historyData = ref(null)
const analysis = ref(null)
const loadingAnalysis = ref(false)

const rsiValue = ref(null)
const macdValue = ref(null)
const bollingerValue = ref(null)

const maOptions = reactive({ ma5: true, ma10: true, ma20: true, ma60: false })

const candlestickEl = ref(null)
const volumeEl = ref(null)
const rsiEl = ref(null)
const macdEl = ref(null)
const bollingerEl = ref(null)

const periods = [
  { value: '3mo', label: '3個月' },
  { value: '6mo', label: '6個月' },
  { value: '1y', label: '1年' },
  { value: '2y', label: '2年' },
]

const scoreColor = computed(() => {
  const s = analysis.value?.overallScore
  if (s == null) return 'var(--text-primary)'
  if (s >= 65) return 'var(--gain)'
  if (s <= 35) return 'var(--loss)'
  return 'var(--text-primary)'
})

onMounted(() => {
  const sym = route.query.symbol
  if (sym) loadAnalysis(sym)
})

onBeforeUnmount(() => {
  charts.destroyAll()
})

async function onSearch() {
  const query = searchQuery.value.trim()
  if (!query) { searchResults.value = []; return }
  searchResults.value = await api.searchStock(query)
}

async function onSearchEnter() {
  const code = searchQuery.value.trim()
  if (!code) return
  searchQuery.value = ''
  searchResults.value = []
  try {
    loadingState.value = true
    await api.fetchQuote(code)
    loadAnalysis(code)
  } catch {
    loadingState.value = false
    showToast('找不到此股票', 'error')
  }
}

async function onSelectStock(stock) {
  searchQuery.value = ''
  searchResults.value = []
  try {
    loadingState.value = true
    await api.fetchQuote(stock.symbol)
    loadAnalysis(stock.symbol)
  } catch {
    loadingState.value = false
    showToast('找不到此股票', 'error')
  }
}

function changeRange(range) {
  currentRange.value = range
  if (currentSymbol.value) loadAnalysis(currentSymbol.value)
}

async function loadAnalysis(symbol) {
  currentSymbol.value = symbol
  loadingAnalysis.value = true
  loadingState.value = true

  try {
    const [quote, hist] = await Promise.all([
      api.fetchQuote(symbol),
      api.fetchHistory(symbol, currentRange.value),
    ])

    quoteData.value = quote
    historyData.value = hist

    const signalData = await api.fetchHistory(symbol, '3mo')
    analysis.value = indicators.generateSignals(signalData)

    await nextTick()
    renderAllCharts(hist.history)
  } catch (err) {
    console.error('Analysis load error:', err)
    showToast(`無法載入 ${symbol} 的分析資料`, 'error')
    quoteData.value = null
    historyData.value = null
  } finally {
    loadingAnalysis.value = false
    loadingState.value = false
  }
}

function renderAllCharts(history) {
  if (!candlestickEl.value) return

  charts.renderCandlestickChart(candlestickEl.value, history, LightweightCharts)
  charts.renderVolumeChart(volumeEl.value, history, LightweightCharts)
  charts.addMovingAverages(history, maOptions, indicators)

  const rsi = charts.renderRSIChart(rsiEl.value, history, LightweightCharts, indicators)
  rsiValue.value = rsi ? rsi.toFixed(2) : null

  const macd = charts.renderMACDChart(macdEl.value, history, LightweightCharts, indicators)
  macdValue.value = macd ? macd.toFixed(2) : null

  const bb = charts.renderBollingerChart(bollingerEl.value, history, LightweightCharts, indicators)
  bollingerValue.value = bb || null
}

function updateMA() {
  if (historyData.value) {
    charts.addMovingAverages(historyData.value.history, maOptions, indicators)
  }
}
</script>
