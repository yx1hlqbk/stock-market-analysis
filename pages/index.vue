<template>
  <section class="page active">
    <div class="page-header">
      <h1>儀表板</h1>
      <p class="page-subtitle">管理您的自選股票與市場概覽</p>
    </div>

    <div class="watchlist-toolbar">
      <div class="add-stock-form">
        <div class="input-group">
          <IconSearch class="input-icon" />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="form-input"
            placeholder="輸入股票代碼 (例如: 2330)..."
            autocomplete="off"
            @input="onSearch"
            @keydown.enter="onAddByCode"
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
        <button class="btn btn-primary" @click="onAddByCode">
          <IconPlus />
          <span>加入追蹤</span>
        </button>
      </div>
      <button class="btn btn-outline" @click="onRefresh">
        <IconRefreshCw />
        <span>重新整理</span>
      </button>
    </div>

    <div class="card">
      <div class="card-body no-padding">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>股票代碼</th>
                <th>名稱</th>
                <th class="text-right">現價</th>
                <th class="text-right">漲跌</th>
                <th class="text-right">漲跌幅</th>
                <th class="text-right">成交量</th>
                <th class="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <!-- Empty state -->
              <tr v-if="symbols.length === 0" class="empty-row">
                <td colspan="7">
                  <div class="empty-state">
                    <IconInbox :size="48" :stroke-width="1.5" style="opacity:0.4;margin-bottom:16px" />
                    <p>追蹤清單是空的，請新增股票開始追蹤</p>
                  </div>
                </td>
              </tr>
              <!-- Loading skeleton -->
              <tr v-else-if="loading" v-for="sym in symbols" :key="sym">
                <td><span class="mono">{{ sym }}</span></td>
                <td>{{ api.getStockName(sym) }}</td>
                <td class="text-right"><div class="skeleton" style="width:60px;height:18px;display:inline-block"></div></td>
                <td class="text-right"><div class="skeleton" style="width:50px;height:18px;display:inline-block"></div></td>
                <td class="text-right"><div class="skeleton" style="width:55px;height:18px;display:inline-block"></div></td>
                <td class="text-right"><div class="skeleton" style="width:70px;height:18px;display:inline-block"></div></td>
                <td class="text-center">-</td>
              </tr>
              <!-- Data rows -->
              <template v-else>
                <tr
                  v-for="sym in symbols"
                  :key="sym"
                  class="watchlist-row"
                  style="cursor:pointer"
                  @click="goAnalysis(sym)"
                >
                  <td>
                    <span class="mono" style="color:var(--accent-blue);font-weight:600">{{ sym }}</span>
                  </td>
                  <td>{{ getQuote(sym)?.name || api.getStockName(sym) }}</td>
                  <td class="text-right mono" style="font-weight:600">
                    {{ getQuote(sym)?.price?.toFixed(2) || '--' }}
                  </td>
                  <td class="text-right mono" :class="gainClass(sym)">
                    {{ formatChange(sym) }}
                  </td>
                  <td class="text-right mono" :class="gainClass(sym)">
                    {{ formatChangePercent(sym) }}
                  </td>
                  <td class="text-right mono" style="color:var(--text-secondary)">
                    {{ formatVolume(getQuote(sym)?.volume) }}
                  </td>
                  <td class="text-center" @click.stop>
                    <button
                      class="btn btn-sm btn-outline"
                      style="margin-right:4px"
                      title="分析"
                      @click="goAnalysis(sym)"
                    >📊</button>
                    <button
                      class="btn btn-danger btn-sm"
                      title="移除"
                      @click="onRemove(sym)"
                    >✕</button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const router = useRouter()
const api = useApi()
const { list, init, getSymbols, addStock, removeStock } = useWatchlist()
const { showToast } = useToast()

const searchQuery = ref('')
const searchResults = ref([])
const quotes = ref([])
const loading = ref(false)

const symbols = computed(() => getSymbols())

onMounted(async () => {
  init()
  if (symbols.value.length > 0) {
    await refreshQuotes()
  }
})

async function refreshQuotes() {
  loading.value = true
  try {
    quotes.value = await api.fetchMultipleQuotes(symbols.value)
  } catch (e) {
    showToast('更新報價失敗', 'error')
  } finally {
    loading.value = false
  }
}

function getQuote(sym) {
  return quotes.value.find(q => q.symbol === sym)
}

function gainClass(sym) {
  const q = getQuote(sym)
  if (!q) return ''
  return q.changePercent >= 0 ? 'gain' : 'loss'
}

function formatChange(sym) {
  const q = getQuote(sym)
  if (!q) return '--'
  const isGain = q.changePercent >= 0
  return `${isGain ? '+' : ''}${q.change.toFixed(2)}`
}

function formatChangePercent(sym) {
  const q = getQuote(sym)
  if (!q) return '--'
  const isGain = q.changePercent >= 0
  const arrow = isGain ? '▲' : '▼'
  return `${arrow} ${Math.abs(q.changePercent).toFixed(2)}%`
}

function formatVolume(vol) {
  if (!vol) return '-'
  if (vol >= 100000000) return (vol / 100000000).toFixed(1) + ' 億'
  if (vol >= 10000) return (vol / 10000).toFixed(0) + ' 萬'
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K'
  return vol.toString()
}

async function onSearch() {
  const query = searchQuery.value.trim()
  if (!query) { searchResults.value = []; return }
  searchResults.value = await api.searchStock(query)
}

async function onSelectStock(stock) {
  searchQuery.value = ''
  searchResults.value = []
  try {
    showToast('驗證中...', 'info')
    const quote = await api.fetchQuote(stock.symbol)
    doAdd(quote.symbol, quote.name)
  } catch {
    showToast('驗證失敗，找不到此股票', 'error')
  }
}

async function onAddByCode() {
  const code = searchQuery.value.trim()
  if (!code) return
  searchQuery.value = ''
  searchResults.value = []
  try {
    showToast('驗證中...', 'info')
    const quote = await api.fetchQuote(code)
    doAdd(quote.symbol, quote.name)
  } catch {
    showToast('找不到此股票', 'error')
  }
}

function doAdd(symbol, name) {
  const result = addStock(symbol, name)
  showToast(result.message, result.success ? 'success' : 'error')
  if (result.success) refreshQuotes()
}

function onRemove(sym) {
  const result = removeStock(sym)
  showToast(result.message, 'success')
  quotes.value = quotes.value.filter(q => q.symbol !== sym)
}

async function onRefresh() {
  api.clearCache()
  showToast('正在更新報價...', 'info')
  await refreshQuotes()
  showToast('報價已更新', 'success')
}

function goAnalysis(sym) {
  router.push({ path: '/analysis', query: { symbol: sym } })
}
</script>
