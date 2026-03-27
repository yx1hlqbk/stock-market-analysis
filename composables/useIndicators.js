export function useIndicators() {
  function calculateSMA(data, period) {
    const result = []
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null)
      } else {
        let sum = 0
        for (let j = 0; j < period; j++) sum += data[i - j]
        result.push(sum / period)
      }
    }
    return result
  }

  function calculateEMA(data, period) {
    const result = []
    const multiplier = 2 / (period + 1)
    let sum = 0
    for (let i = 0; i < period; i++) {
      sum += data[i]
      result.push(null)
    }
    result[period - 1] = sum / period
    for (let i = period; i < data.length; i++) {
      const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1]
      result.push(ema)
    }
    return result
  }

  function calculateRSI(closePrices, period = 14) {
    const result = []
    const gains = []
    const losses = []

    for (let i = 0; i < closePrices.length; i++) {
      if (i === 0) {
        gains.push(0)
        losses.push(0)
        result.push(null)
        continue
      }
      const change = closePrices[i] - closePrices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)

      if (i < period) { result.push(null); continue }

      if (i === period) {
        let avgGain = 0, avgLoss = 0
        for (let j = 1; j <= period; j++) { avgGain += gains[j]; avgLoss += losses[j] }
        avgGain /= period; avgLoss /= period
        result.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)))
      } else {
        const prevRSI = result[i - 1]
        if (prevRSI === null) { result.push(null); continue }
        let avgGain = 0, avgLoss = 0
        for (let j = i - period + 1; j <= i; j++) { avgGain += gains[j]; avgLoss += losses[j] }
        avgGain /= period; avgLoss /= period
        result.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)))
      }
    }
    return result
  }

  function calculateMACD(closePrices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const emaFast = calculateEMA(closePrices, fastPeriod)
    const emaSlow = calculateEMA(closePrices, slowPeriod)

    const macdLine = []
    for (let i = 0; i < closePrices.length; i++) {
      if (emaFast[i] !== null && emaSlow[i] !== null) {
        macdLine.push(emaFast[i] - emaSlow[i])
      } else {
        macdLine.push(null)
      }
    }

    const validMacd = macdLine.filter(v => v !== null)
    const signalRaw = calculateEMA(validMacd, signalPeriod)

    const signalLine = []
    const histogram = []
    let validIdx = 0

    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null) {
        signalLine.push(null)
        histogram.push(null)
      } else {
        signalLine.push(signalRaw[validIdx] || null)
        histogram.push(signalRaw[validIdx] !== null ? macdLine[i] - signalRaw[validIdx] : null)
        validIdx++
      }
    }
    return { macd: macdLine, signal: signalLine, histogram }
  }

  function calculateBollingerBands(closePrices, period = 20, stdDevMultiplier = 2) {
    const middle = calculateSMA(closePrices, period)
    const upper = []
    const lower = []

    for (let i = 0; i < closePrices.length; i++) {
      if (middle[i] === null) {
        upper.push(null)
        lower.push(null)
      } else {
        let sumSq = 0
        for (let j = 0; j < period; j++) {
          const diff = closePrices[i - j] - middle[i]
          sumSq += diff * diff
        }
        const stdDev = Math.sqrt(sumSq / period)
        upper.push(middle[i] + stdDevMultiplier * stdDev)
        lower.push(middle[i] - stdDevMultiplier * stdDev)
      }
    }
    return { upper, middle, lower }
  }

  function calculateKD(highs, lows, closes, period = 9) {
    const result = { k: [], d: [] }
    let prevK = 50, prevD = 50

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        result.k.push(null)
        result.d.push(null)
        continue
      }
      let maxHigh = -Infinity, minLow = Infinity
      for (let j = 0; j < period; j++) {
        if (highs[i - j] > maxHigh) maxHigh = highs[i - j]
        if (lows[i - j] < minLow) minLow = lows[i - j]
      }
      let rsv = prevK
      if (maxHigh > minLow) rsv = ((closes[i] - minLow) / (maxHigh - minLow)) * 100
      const currentK = (2 / 3) * prevK + (1 / 3) * rsv
      const currentD = (2 / 3) * prevD + (1 / 3) * currentK
      result.k.push(currentK)
      result.d.push(currentD)
      prevK = currentK
      prevD = currentD
    }
    return result
  }

  function calculateVolatility(prices) {
    if (prices.length < 2) return 0
    const returns = []
    for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i - 1]))
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252) * 100
  }

  function calculateTrendStrength(prices, sma) {
    if (prices.length < 20) return 50
    const lastIdx = prices.length - 1
    const price = prices[lastIdx]
    const ma = sma[lastIdx]
    if (!ma) return 50
    const deviation = Math.abs((price - ma) / ma) * 100
    return Math.min(100, deviation * 10)
  }

  function generateSignals(historyData) {
    const closes = historyData.history.map(h => h.close)
    const highs = historyData.history.map(h => h.high)
    const lows = historyData.history.map(h => h.low)
    const volumes = historyData.history.map(h => h.volume)
    const lastIdx = closes.length - 1

    const rsi = calculateRSI(closes, 14)
    const macd = calculateMACD(closes)
    const bollinger = calculateBollingerBands(closes)
    const sma5 = calculateSMA(closes, 5)
    const sma10 = calculateSMA(closes, 10)
    const sma20 = calculateSMA(closes, 20)
    const sma60 = calculateSMA(closes, 60)

    const currentRSI = rsi[lastIdx]
    const currentMACD = macd.macd[lastIdx]
    const currentSignal = macd.signal[lastIdx]
    const currentHist = macd.histogram[lastIdx]
    const prevHist = macd.histogram[lastIdx - 1]
    const currentPrice = closes[lastIdx]

    const signals = []
    let buyScore = 0, sellScore = 0

    // RSI
    if (currentRSI !== null) {
      if (currentRSI < 30) {
        signals.push({ indicator: 'RSI (14)', value: currentRSI.toFixed(2), signal: 'buy', label: '買進', description: `RSI ${currentRSI.toFixed(1)} < 30，處於超賣區域，可能反彈` })
        buyScore += 15
      } else if (currentRSI > 70) {
        signals.push({ indicator: 'RSI (14)', value: currentRSI.toFixed(2), signal: 'sell', label: '賣出', description: `RSI ${currentRSI.toFixed(1)} > 70，處於超買區域，可能回檔` })
        sellScore += 15
      } else {
        signals.push({ indicator: 'RSI (14)', value: currentRSI.toFixed(2), signal: 'neutral', label: '中性', description: `RSI ${currentRSI.toFixed(1)} 在 30-70 之間，趨勢中性` })
      }
    }

    // MACD
    if (currentMACD !== null && currentSignal !== null) {
      const isBullishCross = currentMACD > currentSignal && macd.macd[lastIdx - 1] <= macd.signal[lastIdx - 1]
      const isBearishCross = currentMACD < currentSignal && macd.macd[lastIdx - 1] >= macd.signal[lastIdx - 1]
      if (isBullishCross || (currentMACD > currentSignal && currentHist > 0 && currentHist > prevHist)) {
        signals.push({ indicator: 'MACD', value: currentMACD.toFixed(2), signal: 'buy', label: '買進', description: isBullishCross ? 'MACD 黃金交叉，較強多頭信號' : 'MACD 柱狀體放大，多頭動能增強' })
        buyScore += 20
      } else if (isBearishCross || (currentMACD < currentSignal && currentHist < 0 && currentHist < prevHist)) {
        signals.push({ indicator: 'MACD', value: currentMACD.toFixed(2), signal: 'sell', label: '賣出', description: isBearishCross ? 'MACD 死亡交叉，較強空頭信號' : 'MACD 柱狀體放大，空頭動能增強' })
        sellScore += 20
      } else {
        signals.push({ indicator: 'MACD', value: currentMACD.toFixed(2), signal: 'neutral', label: '中性', description: 'MACD 趨勢不明確' })
      }
    }

    // KD
    const kd = calculateKD(highs, lows, closes)
    const currentK = kd.k[lastIdx], currentD = kd.d[lastIdx]
    const prevK = kd.k[lastIdx - 1], prevD = kd.d[lastIdx - 1]
    if (currentK !== null && currentD !== null) {
      const isKdGoldenCross = (currentK > currentD) && (prevK <= prevD)
      const isKdDeathCross = (currentK < currentD) && (prevK >= prevD)
      if (isKdGoldenCross && currentK < 30) {
        signals.push({ indicator: 'KD (9,3,3)', value: `K: ${currentK.toFixed(1)}, D: ${currentD.toFixed(1)}`, signal: 'buy', label: '買進', description: '低檔黃金交叉 (K<30)，反彈機率高' })
        buyScore += 20
      } else if (isKdDeathCross && currentK > 70) {
        signals.push({ indicator: 'KD (9,3,3)', value: `K: ${currentK.toFixed(1)}, D: ${currentD.toFixed(1)}`, signal: 'sell', label: '賣出', description: '高檔死亡交叉 (K>70)，回檔風險大' })
        sellScore += 20
      } else {
        signals.push({ indicator: 'KD (9,3,3)', value: `K: ${currentK.toFixed(1)}, D: ${currentD.toFixed(1)}`, signal: 'neutral', label: '中性', description: '指標正常波動，未出現極端交叉' })
      }
    }

    // Bollinger
    if (bollinger.upper[lastIdx] !== null) {
      if (currentPrice <= bollinger.lower[lastIdx]) {
        signals.push({ indicator: '布林通道', value: `${bollinger.lower[lastIdx].toFixed(2)}`, signal: 'buy', label: '買進', description: '價格觸及下軌，具備支撐反彈潛力' })
        buyScore += 15
      } else if (currentPrice >= bollinger.upper[lastIdx]) {
        signals.push({ indicator: '布林通道', value: `${bollinger.upper[lastIdx].toFixed(2)}`, signal: 'sell', label: '賣出', description: '價格觸及上軌，面臨壓力可能回檔' })
        sellScore += 15
      } else {
        const bbWidth = (bollinger.upper[lastIdx] - bollinger.lower[lastIdx]) / bollinger.middle[lastIdx] * 100
        signals.push({ indicator: '布林通道', value: `帶寬 ${bbWidth.toFixed(1)}%`, signal: 'neutral', label: '中性', description: '價格在通道內運行' })
      }
    }

    // MA5/MA20
    if (sma5[lastIdx] !== null && sma20[lastIdx] !== null) {
      const ma5Above20 = sma5[lastIdx] > sma20[lastIdx]
      const prevMa5Above20 = sma5[lastIdx - 1] > sma20[lastIdx - 1]
      const isGoldenCross = ma5Above20 && !prevMa5Above20
      const isDeathCross = !ma5Above20 && prevMa5Above20
      if (isGoldenCross || (currentPrice > sma5[lastIdx] && currentPrice > sma20[lastIdx])) {
        signals.push({ indicator: '短中期均線', value: `MA5: ${sma5[lastIdx].toFixed(2)}`, signal: 'buy', label: '偏多', description: isGoldenCross ? 'MA5 上穿 MA20 黃金交叉' : '股價站穩短期與中期均線之上' })
        buyScore += 10
      } else if (isDeathCross || (currentPrice < sma5[lastIdx] && currentPrice < sma20[lastIdx])) {
        signals.push({ indicator: '短中期均線', value: `MA5: ${sma5[lastIdx].toFixed(2)}`, signal: 'sell', label: '偏空', description: isDeathCross ? 'MA5 下穿 MA20 死亡交叉' : '股價跌破短期與中期均線' })
        sellScore += 10
      } else {
        signals.push({ indicator: '短中期均線', value: `MA5: ${sma5[lastIdx].toFixed(2)}`, signal: 'neutral', label: '中性', description: '均線交織，多空膠著' })
      }
    }

    // MA60
    if (sma60[lastIdx] !== null && sma60[lastIdx - 1] !== null) {
      const currentMa60 = sma60[lastIdx], prevMa60 = sma60[lastIdx - 1]
      if (currentPrice >= currentMa60 && currentMa60 >= prevMa60) {
        signals.push({ indicator: '季線趨勢 (MA60)', value: `${currentMa60.toFixed(2)}`, signal: 'buy', label: '偏多', description: '股價站上季線且季線上揚，長線偏多' })
        buyScore += 10
      } else if (currentPrice <= currentMa60 && currentMa60 <= prevMa60) {
        signals.push({ indicator: '季線趨勢 (MA60)', value: `${currentMa60.toFixed(2)}`, signal: 'sell', label: '偏空', description: '股價跌破季線且季線向下，長線偏空' })
        sellScore += 10
      } else {
        signals.push({ indicator: '季線趨勢 (MA60)', value: `${currentMa60.toFixed(2)}`, signal: 'neutral', label: '中性', description: '價格與季線糾結，長線方向待定' })
      }
    }

    // Volume
    if (volumes.length >= 5) {
      const avgVol = volumes.slice(-20).reduce((a, b) => a + (b || 0), 0) / 20
      const currentVol = volumes[lastIdx] || 0
      const volRatio = currentVol / avgVol
      if (volRatio >= 1.5 && closes[lastIdx] > closes[lastIdx - 1]) {
        signals.push({ indicator: '成交量', value: `${volRatio.toFixed(1)}x 均量`, signal: 'buy', label: '強勢', description: '量增價漲，多頭帶量攻擊' })
        buyScore += 10
      } else if (volRatio >= 1.5 && closes[lastIdx] < closes[lastIdx - 1]) {
        signals.push({ indicator: '成交量', value: `${volRatio.toFixed(1)}x 均量`, signal: 'sell', label: '弱勢', description: '量增價跌，空頭出貨壓力大' })
        sellScore += 10
      } else {
        signals.push({ indicator: '成交量', value: `${volRatio.toFixed(1)}x 均量`, signal: 'neutral', label: '中性', description: '成交量位於正常範圍' })
      }
    }

    const maxPossible = 100
    const netScore = buyScore - sellScore
    const overallScore = Math.round(50 + (netScore / maxPossible) * 50)

    let action, actionClass
    if (overallScore >= 65) { action = '買進 / 加碼'; actionClass = 'buy' }
    else if (overallScore <= 35) { action = '減碼 / 賣出'; actionClass = 'sell' }
    else { action = '續抱 / 觀望'; actionClass = 'hold' }

    const volatility = calculateVolatility(closes.slice(-20))
    const trendStrength = calculateTrendStrength(closes, sma20)

    return {
      signals,
      overallScore: Math.max(0, Math.min(100, overallScore)),
      action,
      actionClass,
      buyScore,
      sellScore,
      risk: {
        volatility: Math.min(100, volatility),
        trendStrength: Math.min(100, trendStrength),
        momentum: currentRSI || 50,
      },
      indicators: {
        rsi: rsi[lastIdx],
        macd: { macd: currentMACD, signal: currentSignal, histogram: currentHist },
        bollinger: { upper: bollinger.upper[lastIdx], middle: bollinger.middle[lastIdx], lower: bollinger.lower[lastIdx] },
        sma: { sma5: sma5[lastIdx], sma10: sma10[lastIdx], sma20: sma20[lastIdx], sma60: sma60[lastIdx] },
      },
    }
  }

  return {
    calculateSMA,
    calculateEMA,
    calculateRSI,
    calculateMACD,
    calculateBollingerBands,
    calculateKD,
    generateSignals,
  }
}
