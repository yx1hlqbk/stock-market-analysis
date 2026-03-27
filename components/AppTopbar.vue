<template>
  <header class="top-bar">
    <div class="top-bar-actions">
      <button
        class="btn-icon"
        title="清除快取資料"
        style="color: var(--text-muted); display: flex; align-items: center; gap: 8px; padding: 0 12px; width: auto; font-size: 0.9rem;"
        @click="clearAll"
      >
        <IconTrash2 :size="18" />
        <span>清除快取</span>
      </button>
      <div class="clock">{{ market.clock.value }}</div>
    </div>
  </header>
</template>

<script setup>
const market = useMarketStatus()
const { showToast } = useToast()

function clearAll() {
  if (confirm('確定要清除所有快取資料嗎？')) {
    localStorage.clear()
    sessionStorage.clear()
    showToast('已清除所有快取，即將重新載入頁面...', 'success')
    setTimeout(() => location.reload(), 1500)
  }
}
</script>
