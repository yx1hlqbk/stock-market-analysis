<template>
  <nav class="sidebar" :class="{ open: sidebarOpen }">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stop-color="#6C5CE7" />
                <stop offset="100%" stop-color="#00D2FF" />
              </linearGradient>
            </defs>
            <path d="M4 24L10 16L16 20L22 8L28 12" stroke="url(#logoGrad)" stroke-width="3"
              stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="28" cy="12" r="3" fill="#00D2FF" />
          </svg>
        </div>
        <span class="logo-text">StockPulse</span>
      </div>
    </div>

    <ul class="nav-menu">
      <li
        v-for="item in navItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
        @click="navigate(item.path)"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </li>
    </ul>

    <div class="sidebar-footer">
      <div class="market-status">
        <div class="status-dot" :class="market.isOpen.value ? 'open' : 'closed'"></div>
        <span>{{ market.statusText.value }}</span>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { LayoutDashboard, CandlestickChart, Zap } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const sidebarOpen = useState('sidebarOpen', () => false)
const market = useMarketStatus()

const navItems = [
  { path: '/', label: '儀表板', icon: LayoutDashboard },
  { path: '/analysis', label: '技術分析', icon: CandlestickChart },
  { path: '/signals', label: '買賣建議', icon: Zap },
]

onMounted(() => market.start())
onBeforeUnmount(() => market.stop())

function navigate(path) {
  router.push(path)
  sidebarOpen.value = false
}
</script>
