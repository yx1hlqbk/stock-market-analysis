const TWSE_BASE = 'https://www.twse.com.tw/exchangeReport/STOCK_DAY'

export function parseROCDate(rocDateStr) {
  const parts = rocDateStr.trim().split('/')
  const year = parseInt(parts[0], 10) + 1911
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  return new Date(year, month - 1, day)
}

export function parseNumber(str) {
  if (!str || str === '--' || str === 'X') return null
  return parseFloat(str.replace(/,/g, ''))
}

export async function fetchMonthData(stockNo, dateStr) {
  const url = `${TWSE_BASE}?response=json&date=${dateStr}&stockNo=${stockNo}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  })
  if (!resp.ok) throw new Error(`TWSE HTTP ${resp.status}`)
  const data = await resp.json()
  if (data.stat !== 'OK') throw new Error(`TWSE stat: ${data.stat}`)
  return data
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
