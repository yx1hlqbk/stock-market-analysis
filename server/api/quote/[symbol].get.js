import { fetchMonthData, parseROCDate, parseNumber } from '~/server/utils/twse.js'

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')

  if (!/^\d{4,6}$/.test(symbol)) {
    throw createError({ statusCode: 400, message: '無效的股票代碼' })
  }

  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}01`

  let data
  try {
    data = await fetchMonthData(symbol, dateStr)
  } catch (e) {
    // 如果當月還沒有資料，嘗試上個月
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevDateStr = `${prev.getFullYear()}${String(prev.getMonth() + 1).padStart(2, '0')}01`
    try {
      data = await fetchMonthData(symbol, prevDateStr)
    } catch {
      throw createError({ statusCode: 404, message: '查無資料' })
    }
  }

  if (!data.data || data.data.length === 0) {
    throw createError({ statusCode: 404, message: '查無資料' })
  }

  const last = data.data[data.data.length - 1]
  const prev = data.data.length > 1 ? data.data[data.data.length - 2] : null

  const close = parseNumber(last[6])
  const prevClose = prev ? parseNumber(prev[6]) : close
  const change = close - prevClose
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0

  let name = symbol
  if (data.title) {
    const match = data.title.match(/\d+\s+(\S+)/)
    if (match) name = match[1]
  }

  return {
    symbol,
    name,
    price: close,
    previousClose: prevClose,
    change,
    changePercent,
    volume: parseNumber(last[1]),
    high: parseNumber(last[4]),
    low: parseNumber(last[5]),
    open: parseNumber(last[3]),
    currency: 'TWD',
    exchange: 'TWSE',
    timestamp: Math.floor(parseROCDate(last[0]).getTime() / 1000),
  }
})
