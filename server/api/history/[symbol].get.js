import { fetchMonthData, parseROCDate, parseNumber, sleep } from '~/server/utils/twse.js'

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
  const query = getQuery(event)
  const range = query.range || '3mo'

  if (!/^\d{4,6}$/.test(symbol)) {
    throw createError({ statusCode: 400, message: '無效的股票代碼' })
  }

  const months = range === '2y' ? 24 : range === '1y' ? 12 : range === '6mo' ? 6 : 3
  const now = new Date()
  const allHistory = []
  let stockName = symbol

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const dateStr = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}01`

    try {
      const data = await fetchMonthData(symbol, dateStr)

      if (data.title) {
        const match = data.title.match(/\d+\s+(\S+)/)
        if (match) stockName = match[1]
      }

      if (data.data) {
        for (const row of data.data) {
          const d = parseROCDate(row[0])
          allHistory.push({
            time: d.toISOString().split('T')[0],
            timestamp: Math.floor(d.getTime() / 1000),
            open: parseNumber(row[3]),
            high: parseNumber(row[4]),
            low: parseNumber(row[5]),
            close: parseNumber(row[6]),
            volume: parseNumber(row[1]),
          })
        }
      }
    } catch (e) {
      console.warn(`TWSE ${symbol} ${dateStr} failed:`, e.message)
    }

    if (i > 0) await sleep(600)
  }

  const history = allHistory.filter(d => d.open !== null && d.close !== null)

  return {
    symbol,
    name: stockName,
    history,
    meta: {
      regularMarketPrice: history.length ? history[history.length - 1].close : 0,
      chartPreviousClose: history.length > 1 ? history[history.length - 2].close : 0,
    },
  }
})
