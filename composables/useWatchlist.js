const STORAGE_KEY = 'stockpulse_watchlist'

function readStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function writeStorage(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function useWatchlist() {
  const list = useState('watchlist', () => [])

  function init() {
    if (import.meta.client) {
      list.value = readStorage()
    }
  }

  function getSymbols() {
    return list.value.map(s => s.symbol)
  }

  function addStock(symbol, name) {
    const code = symbol.replace('.TW', '').replace('.TWO', '').trim()
    if (list.value.some(s => s.symbol === code)) {
      return { success: false, message: `${code} 已在追蹤清單中` }
    }
    list.value.push({ symbol: code, name: name || code, addedAt: Date.now() })
    writeStorage(list.value)
    return { success: true, message: `已加入 ${code} ${name || ''}` }
  }

  function removeStock(symbol) {
    const code = symbol.replace('.TW', '').replace('.TWO', '').trim()
    list.value = list.value.filter(s => s.symbol !== code)
    writeStorage(list.value)
    return { success: true, message: `已移除 ${code}` }
  }

  function isTracked(symbol) {
    const code = symbol.replace('.TW', '').replace('.TWO', '').trim()
    return list.value.some(s => s.symbol === code)
  }

  return { list, init, getSymbols, addStock, removeStock, isTracked }
}
