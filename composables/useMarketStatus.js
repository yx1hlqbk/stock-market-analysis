export function useMarketStatus() {
  const clock = ref('')
  const isOpen = ref(false)
  const statusText = ref('市場狀態載入中...')
  let clockTimer = null
  let statusTimer = null

  function updateClock() {
    const now = new Date()
    clock.value = now.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  function updateMarketStatus() {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const day = now.getDay()
    const time = hours * 60 + minutes

    const isWeekday = day >= 1 && day <= 5
    const isMarketHours = time >= 540 && time <= 810
    isOpen.value = isWeekday && isMarketHours

    if (isOpen.value) {
      statusText.value = '市場開盤中'
    } else {
      statusText.value = `休市中 · ${getNextMarketOpen(now)}`
    }
  }

  function getNextMarketOpen(now) {
    const day = now.getDay()
    const time = now.getHours() * 60 + now.getMinutes()

    if (day >= 1 && day <= 5 && time < 540) return '今日 09:00 開盤'
    if (day === 5 && time >= 810) return '下週一 09:00 開盤'
    if (day === 6) return '下週一 09:00 開盤'
    if (day === 0) return '明日 09:00 開盤'
    return '明日 09:00 開盤'
  }

  function start() {
    updateClock()
    updateMarketStatus()
    clockTimer = setInterval(updateClock, 1000)
    statusTimer = setInterval(updateMarketStatus, 60000)
  }

  function stop() {
    if (clockTimer) clearInterval(clockTimer)
    if (statusTimer) clearInterval(statusTimer)
  }

  return { clock, isOpen, statusText, start, stop }
}
