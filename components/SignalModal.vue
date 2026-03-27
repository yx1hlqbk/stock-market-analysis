<template>
  <div class="modal" :class="{ open: open }">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <button class="modal-close" @click="$emit('close')">
        <IconX />
      </button>

      <div v-if="data">
        <!-- Stock Info -->
        <div class="card" style="margin-bottom:16px; border:none; background:transparent">
          <div class="stock-info-header" style="padding:0">
            <div class="stock-info-left">
              <h2>{{ data.quote.name }}</h2>
              <span class="stock-code">{{ data.quote.symbol }}</span>
            </div>
            <div class="stock-info-right">
              <span class="stock-price">{{ data.quote.price?.toFixed(2) }}</span>
              <span class="stock-change" :class="data.quote.changePercent >= 0 ? 'gain' : 'loss'">
                {{ data.quote.changePercent >= 0 ? '+' : '' }}{{ data.quote.change?.toFixed(2) }}
                ({{ data.quote.changePercent >= 0 ? '+' : '' }}{{ data.quote.changePercent?.toFixed(2) }}%)
              </span>
            </div>
          </div>
        </div>

        <!-- Score + Signals -->
        <div class="signal-overview-grid">
          <div class="card signal-score-card">
            <div class="signal-score-ring">
              <svg viewBox="0 0 120 120" class="score-ring-svg">
                <circle cx="60" cy="60" r="50" class="ring-bg" />
                <circle
                  cx="60" cy="60" r="50"
                  class="ring-fill"
                  :style="ringStyle"
                />
              </svg>
              <div class="score-text">
                <span class="score-number">{{ data.analysis.overallScore }}</span>
                <span class="score-label">綜合評分</span>
              </div>
            </div>
            <div class="signal-action">
              <span class="action-label">建議操作</span>
              <span class="action-badge" :class="data.analysis.actionClass">{{ data.analysis.action }}</span>
            </div>
          </div>

          <div class="card signal-detail-card">
            <div class="card-header">
              <h3>指標信號明細</h3>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="signal-table">
                  <thead>
                    <tr>
                      <th>指標</th>
                      <th>數值</th>
                      <th>信號</th>
                      <th>說明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(s, idx) in data.analysis.signals" :key="idx">
                      <td style="font-weight:600">{{ s.indicator }}</td>
                      <td class="mono">{{ s.value }}</td>
                      <td>
                        <span class="signal-dot" :class="s.signal"></span>
                        <span :class="signalColorClass(s.signal)">{{ s.label }}</span>
                      </td>
                      <td style="color:var(--text-secondary);font-size:0.85rem">{{ s.description }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk -->
        <div class="card">
          <div class="card-header">
            <h3>風險分析</h3>
          </div>
          <div class="card-body">
            <div class="risk-meters">
              <div class="risk-meter">
                <span class="risk-meter-label">波動率</span>
                <div class="risk-bar">
                  <div class="risk-bar-fill" :style="{ width: data.analysis.risk.volatility + '%', background: riskColor(data.analysis.risk.volatility) }"></div>
                </div>
                <span class="risk-value">{{ data.analysis.risk.volatility.toFixed(1) }}%</span>
              </div>
              <div class="risk-meter">
                <span class="risk-meter-label">趨勢強度</span>
                <div class="risk-bar">
                  <div class="risk-bar-fill" :style="{ width: data.analysis.risk.trendStrength + '%', background: trendColor(data.analysis.risk.trendStrength) }"></div>
                </div>
                <span class="risk-value">{{ data.analysis.risk.trendStrength.toFixed(1) }}</span>
              </div>
              <div class="risk-meter">
                <span class="risk-meter-label">動能 (RSI)</span>
                <div class="risk-bar">
                  <div class="risk-bar-fill" :style="{ width: data.analysis.risk.momentum + '%', background: momentumColor(data.analysis.risk.momentum) }"></div>
                </div>
                <span class="risk-value">{{ data.analysis.risk.momentum.toFixed(1) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="loadingModal" class="empty-state">
        <div class="spinner-ring"></div>
        <p>載入中...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  open: Boolean,
  symbol: String,
})
defineEmits(['close'])

const api = useApi()
const indicators = useIndicators()
const { showToast } = useToast()

const data = ref(null)
const loadingModal = ref(false)

const circumference = 2 * Math.PI * 50
const ringStyle = computed(() => {
  if (!data.value) return {}
  const offset = circumference - (data.value.analysis.overallScore / 100) * circumference
  return {
    strokeDasharray: circumference,
    strokeDashoffset: offset,
  }
})

watch(() => props.symbol, async (sym) => {
  if (!sym) { data.value = null; return }
  loadingModal.value = true
  try {
    const [quote, hist] = await Promise.all([
      api.fetchQuote(sym),
      api.fetchHistory(sym, '3mo'),
    ])
    const analysis = indicators.generateSignals(hist)
    data.value = { quote, analysis }
  } catch {
    showToast(`無法載入 ${sym} 的買賣建議`, 'error')
    data.value = null
  } finally {
    loadingModal.value = false
  }
})

function signalColorClass(signal) {
  if (signal === 'buy') return 'gain'
  if (signal === 'sell') return 'loss'
  return 'neutral-color'
}

function riskColor(value) {
  if (value < 20) return 'var(--gain)'
  if (value < 40) return '#22d3ee'
  if (value < 60) return 'var(--neutral)'
  if (value < 80) return '#f97316'
  return 'var(--loss)'
}

function trendColor(value) {
  if (value < 30) return 'var(--text-muted)'
  if (value < 60) return 'var(--accent-blue)'
  return 'var(--accent-purple)'
}

function momentumColor(value) {
  if (value < 30) return 'var(--gain)'
  if (value < 70) return 'var(--accent-blue)'
  return 'var(--loss)'
}
</script>
