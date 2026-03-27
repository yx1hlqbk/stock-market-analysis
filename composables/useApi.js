import { TAIWAN_STOCK_NAMES } from '~/data/stockNames.js'

const cache = new Map()
const dynamicNameCache = new Map()

let namesCacheLoaded = false
function loadNamesCache() {
  if (namesCacheLoaded || !import.meta.client) return
  namesCacheLoaded = true
  try {
    const saved = localStorage.getItem('stockpulse_name_cache')
    if (saved) {
      const parsed = JSON.parse(saved)
      Object.entries(parsed).forEach(([k, v]) => dynamicNameCache.set(k, v))
    }
  } catch {}
}

function cleanSymbol(symbol) {
  return symbol.replace('.TW', '').replace('.TWO', '').trim()
}

function getCache(key) {
  const item = cache.get(key)
  if (!item) return null
  return item.data
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function getStockName(symbol) {
  const code = cleanSymbol(symbol)
  const fromCache = dynamicNameCache.get(code)
  if (fromCache) return fromCache
  if (TAIWAN_STOCK_NAMES[code]) return TAIWAN_STOCK_NAMES[code]
  return code
}

function saveStockName(symbol, name) {
  const code = cleanSymbol(symbol)
  if (!name || name === code) return
  dynamicNameCache.set(code, name)
  if (!import.meta.client) return
  try {
    const obj = {}
    dynamicNameCache.forEach((v, k) => (obj[k] = v))
    localStorage.setItem('stockpulse_name_cache', JSON.stringify(obj))
  } catch {}
}

export function useApi() {
  loadNamesCache()

  async function fetchQuote(symbol) {
    const code = cleanSymbol(symbol)
    const cacheKey = `quote_${code}`
    const cached = getCache(cacheKey)
    if (cached) return cached

    const data = await $fetch(`/api/quote/${code}`)
    if (data.name && data.name !== code) saveStockName(code, data.name)
    setCache(cacheKey, data)
    return data
  }

  async function fetchHistory(symbol, range = '3mo') {
    const code = cleanSymbol(symbol)
    const cacheKey = `history_${code}_${range}`
    const cached = getCache(cacheKey)
    if (cached) return cached

    const data = await $fetch(`/api/history/${code}`, { query: { range } })
    if (data.name && data.name !== code) saveStockName(code, data.name)
    setCache(cacheKey, data)
    return data
  }

  async function searchStock(keyword) {
    keyword = keyword.trim().toUpperCase()
    if (!keyword) return []
    return [{ symbol: keyword, name: getStockName(keyword), industry: 'TWSE 查詢' }]
  }

  async function fetchMultipleQuotes(symbols) {
    const results = []
    for (let i = 0; i < symbols.length; i++) {
      try {
        const quote = await fetchQuote(symbols[i])
        results.push(quote)
      } catch (e) {
        console.warn(`Quote for ${symbols[i]} failed:`, e)
      }
      if (i < symbols.length - 1) await sleep(600)
    }
    return results
  }

  function clearCache() {
    cache.clear()
  }

  return {
    fetchQuote,
    fetchHistory,
    searchStock,
    fetchMultipleQuotes,
    getStockName,
    saveStockName,
    clearCache,
  }
}
