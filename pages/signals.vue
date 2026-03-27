<template>
  <section class="page active">
    <div class="page-header">
      <h1>買賣建議</h1>
      <p class="page-subtitle">根據技術指標綜合分析，提供操作建議</p>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header">
        <h3>追蹤股票 — 信號總覽</h3>
        <button class="btn btn-outline btn-sm" @click="onRefresh">
          <IconRefreshCw />
          <span>重新分析</span>
        </button>
      </div>
      <div style="padding: 20px;">
        <!-- Empty -->
        <div v-if="symbols.length === 0" class="empty-state">
          <IconZap :size="48" :stroke-width="1.5" style="opacity:0.4;margin-bottom:16px" />
          <p>尚未追蹤任何股票，請先到追蹤清單新增股票</p>
          <NuxtLink to="/" class="btn btn-primary btn-sm" style="margin-top:12px">前往追蹤清單</NuxtLink>
        </div>

        <!-- Loading -->
        <div v-else-if="loadingSignals" class="signals-card-grid">
          <div v-for="sym in symbols" :key="sym" class="signal-overview-card skeleton" style="height: 180px;"></div>
        </div>

        <!-- Results -->
        <div v-else class="signals-card-grid">
          <div
            v-for="r in results"
            :key="r.symbol"
            class="signal-overview-card signal-overview-row"
            :class="{ active: selectedSymbol === r.symbol }"
            @click="onCardClick(r)"
          >
            <!-- Error card -->
            <div v-if="r.error" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">
              <div style="text-align:center">
                <IconAlertCircle style="opacity:0.5;margin-bottom:8px" />
                <div>{{ r.symbol }} 無法分析</div>
              </div>
            </div>

            <!-- Data card -->
            <template v-else>
              <div class="signal-card-header">
                <div>
                  <div style="font-weight:600;font-size:1.1rem">{{ r.quote?.name }}</div>
                  <div class="mono" style="color:var(--text-muted);font-size:0.85rem">{{ r.symbol }}</div>
                </div>
                <div class="action-badge" :class="r.analysis?.actionClass" style="font-size:0.75rem;padding:4px 12px">
                  {{ r.analysis?.action }}
                </div>
              </div>

              <div style="display:flex;align-items:flex-end;gap:12px;margin-bottom:12px">
                <span class="mono" style="font-size:1.5rem;font-weight:700">{{ r.quote?.price?.toFixed(2) }}</span>
                <span class="mono" :class="r.quote?.changePercent >= 0 ? 'gain' : 'loss'" style="font-size:0.85rem;margin-bottom:4px">
                  {{ r.quote?.changePercent >= 0 ? '▲' : '▼' }} {{ Math.abs(r.quote?.changePercent || 0).toFixed(2) }}%
                </span>
              </div>

              <div class="signal-card-metrics">
                <div>
                  <div style="font-size:0.75rem">評分</div>
                  <div class="mono" :style="{ color: scoreColor(r.analysis?.overallScore), fontWeight: 700, fontSize: '1.1rem' }">
                    {{ r.analysis?.overallScore }}
                  </div>
                </div>
                <div>
                  <div style="font-size:0.75rem">RSI</div>
                  <div class="mono" :style="{ color: rsiColor(r.analysis?.indicators?.rsi) }">
                    {{ r.analysis?.indicators?.rsi != null ? r.analysis.indicators.rsi.toFixed(1) : '--' }}
                  </div>
                </div>
                <div>
                  <div style="font-size:0.75rem">MACD</div>
                  <div class="mono">
                    {{ r.analysis?.indicators?.macd?.macd != null ? r.analysis.indicators.macd.macd.toFixed(1) : '--' }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Signal Modal -->
    <SignalModal
      :open="modalOpen"
      :symbol="selectedSymbol"
      @close="modalOpen = false; selectedSymbol = null"
    />
  </section>
</template>

<script setup>
const api = useApi()
const indicatorsComposable = useIndicators()
const { getSymbols, init } = useWatchlist()
const { showToast } = useToast()
const loadingState = useState('loading', () => false)

const results = ref([])
const loadingSignals = ref(false)
const selectedSymbol = ref(null)
const modalOpen = ref(false)

const symbols = computed(() => getSymbols())

onMounted(async () => {
  init()
  if (symbols.value.length > 0) {
    await loadSignals()
  }
})

async function loadSignals() {
  loadingSignals.value = true
  const res = []
  for (const sym of symbols.value) {
    try {
      const [quote, histData] = await Promise.all([
        api.fetchQuote(sym),
        api.fetchHistory(sym, '3mo'),
      ])
      const analysis = indicatorsComposable.generateSignals(histData)
      res.push({ symbol: sym, quote, analysis, error: false })
    } catch {
      res.push({ symbol: sym, quote: null, analysis: null, error: true })
    }
  }
  results.value = res
  loadingSignals.value = false
}

async function onRefresh() {
  api.clearCache()
  loadingState.value = true
  showToast('正在重新分析...', 'info')
  await loadSignals()
  loadingState.value = false
  showToast('分析完成', 'success')
}

function onCardClick(r) {
  if (r.error) return
  selectedSymbol.value = r.symbol
  modalOpen.value = true
}

function scoreColor(score) {
  if (score == null) return 'var(--text-primary)'
  if (score >= 65) return 'var(--gain)'
  if (score <= 35) return 'var(--loss)'
  return 'var(--text-primary)'
}

function rsiColor(rsi) {
  if (rsi == null) return 'var(--text-secondary)'
  if (rsi > 70) return 'var(--loss)'
  if (rsi < 30) return 'var(--gain)'
  return 'var(--text-secondary)'
}
</script>
