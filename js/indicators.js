/**
 * StockPulse — Technical Indicators Calculator
 * Pure JavaScript implementations of RSI, MACD, Bollinger Bands, SMA, EMA
 */

const Indicators = (() => {

    /**
     * Simple Moving Average
     * @param {number[]} data
     * @param {number} period
     * @returns {(number|null)[]}
     */
    function calculateSMA(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
            } else {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += data[i - j];
                }
                result.push(sum / period);
            }
        }
        return result;
    }

    /**
     * Exponential Moving Average
     * @param {number[]} data
     * @param {number} period
     * @returns {(number|null)[]}
     */
    function calculateEMA(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);

        // First EMA value = SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i];
            result.push(null);
        }
        result[period - 1] = sum / period;

        for (let i = period; i < data.length; i++) {
            const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
            result.push(ema);
        }
        return result;
    }

    /**
     * Relative Strength Index
     * @param {number[]} closePrices
     * @param {number} period (default 14)
     * @returns {(number|null)[]}
     */
    function calculateRSI(closePrices, period = 14) {
        const result = [];
        const gains = [];
        const losses = [];

        // Calculate price changes
        for (let i = 0; i < closePrices.length; i++) {
            if (i === 0) {
                gains.push(0);
                losses.push(0);
                result.push(null);
                continue;
            }

            const change = closePrices[i] - closePrices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);

            if (i < period) {
                result.push(null);
                continue;
            }

            if (i === period) {
                // First average
                let avgGain = 0;
                let avgLoss = 0;
                for (let j = 1; j <= period; j++) {
                    avgGain += gains[j];
                    avgLoss += losses[j];
                }
                avgGain /= period;
                avgLoss /= period;

                if (avgLoss === 0) {
                    result.push(100);
                } else {
                    const rs = avgGain / avgLoss;
                    result.push(100 - (100 / (1 + rs)));
                }
            } else {
                // Subsequent values use smoothing
                const prevRSI = result[i - 1];
                if (prevRSI === null) {
                    result.push(null);
                    continue;
                }

                // Recalculate using Wilder's smoothing
                let avgGain = 0;
                let avgLoss = 0;
                for (let j = i - period + 1; j <= i; j++) {
                    avgGain += gains[j];
                    avgLoss += losses[j];
                }
                avgGain /= period;
                avgLoss /= period;

                if (avgLoss === 0) {
                    result.push(100);
                } else {
                    const rs = avgGain / avgLoss;
                    result.push(100 - (100 / (1 + rs)));
                }
            }
        }
        return result;
    }

    /**
     * MACD (Moving Average Convergence Divergence)
     * @param {number[]} closePrices
     * @param {number} fastPeriod (default 12)
     * @param {number} slowPeriod (default 26)
     * @param {number} signalPeriod (default 9)
     * @returns {{ macd: number[], signal: number[], histogram: number[] }}
     */
    function calculateMACD(closePrices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const emaFast = calculateEMA(closePrices, fastPeriod);
        const emaSlow = calculateEMA(closePrices, slowPeriod);

        // MACD Line = Fast EMA - Slow EMA
        const macdLine = [];
        for (let i = 0; i < closePrices.length; i++) {
            if (emaFast[i] !== null && emaSlow[i] !== null) {
                macdLine.push(emaFast[i] - emaSlow[i]);
            } else {
                macdLine.push(null);
            }
        }

        // Signal Line = EMA of MACD Line
        const validMacd = macdLine.filter(v => v !== null);
        const signalRaw = calculateEMA(validMacd, signalPeriod);

        // Map signal back to full array positions
        const signalLine = [];
        const histogram = [];
        let validIdx = 0;

        for (let i = 0; i < macdLine.length; i++) {
            if (macdLine[i] === null) {
                signalLine.push(null);
                histogram.push(null);
            } else {
                signalLine.push(signalRaw[validIdx] || null);
                histogram.push(
                    signalRaw[validIdx] !== null
                        ? macdLine[i] - signalRaw[validIdx]
                        : null
                );
                validIdx++;
            }
        }

        return { macd: macdLine, signal: signalLine, histogram };
    }

    /**
     * Bollinger Bands
     * @param {number[]} closePrices
     * @param {number} period (default 20)
     * @param {number} stdDevMultiplier (default 2)
     * @returns {{ upper: number[], middle: number[], lower: number[] }}
     */
    function calculateBollingerBands(closePrices, period = 20, stdDevMultiplier = 2) {
        const middle = calculateSMA(closePrices, period);
        const upper = [];
        const lower = [];

        for (let i = 0; i < closePrices.length; i++) {
            if (middle[i] === null) {
                upper.push(null);
                lower.push(null);
            } else {
                // Calculate standard deviation
                let sumSq = 0;
                for (let j = 0; j < period; j++) {
                    const diff = closePrices[i - j] - middle[i];
                    sumSq += diff * diff;
                }
                const stdDev = Math.sqrt(sumSq / period);

                upper.push(middle[i] + stdDevMultiplier * stdDev);
                lower.push(middle[i] - stdDevMultiplier * stdDev);
            }
        }

        return { upper, middle, lower };
    }

    /**
     * Generate comprehensive trading signals based on all indicators
     * @param {object} historyData - History data object from API
     * @returns {object} Signals analysis
     */
    function generateSignals(historyData) {
        const closes = historyData.history.map(h => h.close);
        const highs = historyData.history.map(h => h.high);
        const lows = historyData.history.map(h => h.low);
        const volumes = historyData.history.map(h => h.volume);
        const lastIdx = closes.length - 1;

        // Calculate all indicators
        const rsi = calculateRSI(closes, 14);
        const macd = calculateMACD(closes);
        const bollinger = calculateBollingerBands(closes);
        const sma5 = calculateSMA(closes, 5);
        const sma10 = calculateSMA(closes, 10);
        const sma20 = calculateSMA(closes, 20);
        const sma60 = calculateSMA(closes, 60);

        const currentRSI = rsi[lastIdx];
        const currentMACD = macd.macd[lastIdx];
        const currentSignal = macd.signal[lastIdx];
        const currentHist = macd.histogram[lastIdx];
        const prevHist = macd.histogram[lastIdx - 1];
        const currentPrice = closes[lastIdx];

        const signals = [];
        let buyScore = 0;
        let sellScore = 0;
        const totalWeight = 0;

        // --- RSI Signal ---
        if (currentRSI !== null) {
            if (currentRSI < 30) {
                signals.push({
                    indicator: 'RSI (14)',
                    value: currentRSI.toFixed(2),
                    signal: 'buy',
                    label: '買入',
                    description: `RSI ${currentRSI.toFixed(1)} < 30，處於超賣區域，可能反彈`
                });
                buyScore += 25;
            } else if (currentRSI > 70) {
                signals.push({
                    indicator: 'RSI (14)',
                    value: currentRSI.toFixed(2),
                    signal: 'sell',
                    label: '賣出',
                    description: `RSI ${currentRSI.toFixed(1)} > 70，處於超買區域，可能回檔`
                });
                sellScore += 25;
            } else {
                signals.push({
                    indicator: 'RSI (14)',
                    value: currentRSI.toFixed(2),
                    signal: 'neutral',
                    label: '中性',
                    description: `RSI ${currentRSI.toFixed(1)} 在 30-70 之間，趨勢中性`
                });
            }
        }

        // --- MACD Signal ---
        if (currentMACD !== null && currentSignal !== null) {
            const isBullishCross = currentMACD > currentSignal && macd.macd[lastIdx - 1] <= macd.signal[lastIdx - 1];
            const isBearishCross = currentMACD < currentSignal && macd.macd[lastIdx - 1] >= macd.signal[lastIdx - 1];

            if (isBullishCross || (currentMACD > currentSignal && currentHist > 0 && currentHist > prevHist)) {
                signals.push({
                    indicator: 'MACD',
                    value: currentMACD.toFixed(2),
                    signal: 'buy',
                    label: '買入',
                    description: isBullishCross ? 'MACD 黃金交叉，多頭信號' : 'MACD 柱狀體放大，多頭動能增強'
                });
                buyScore += 30;
            } else if (isBearishCross || (currentMACD < currentSignal && currentHist < 0 && currentHist < prevHist)) {
                signals.push({
                    indicator: 'MACD',
                    value: currentMACD.toFixed(2),
                    signal: 'sell',
                    label: '賣出',
                    description: isBearishCross ? 'MACD 死亡交叉，空頭信號' : 'MACD 柱狀體放大，空頭動能增強'
                });
                sellScore += 30;
            } else {
                signals.push({
                    indicator: 'MACD',
                    value: currentMACD.toFixed(2),
                    signal: 'neutral',
                    label: '中性',
                    description: 'MACD 趨勢不明確'
                });
            }
        }

        // --- Bollinger Bands Signal ---
        if (bollinger.upper[lastIdx] !== null) {
            const bbWidth = (bollinger.upper[lastIdx] - bollinger.lower[lastIdx]) / bollinger.middle[lastIdx] * 100;
            if (currentPrice <= bollinger.lower[lastIdx]) {
                signals.push({
                    indicator: '布林通道',
                    value: `${bollinger.lower[lastIdx].toFixed(2)}`,
                    signal: 'buy',
                    label: '買入',
                    description: '價格觸及下軌，可能反彈回升'
                });
                buyScore += 20;
            } else if (currentPrice >= bollinger.upper[lastIdx]) {
                signals.push({
                    indicator: '布林通道',
                    value: `${bollinger.upper[lastIdx].toFixed(2)}`,
                    signal: 'sell',
                    label: '賣出',
                    description: '價格觸及上軌，可能回檔修正'
                });
                sellScore += 20;
            } else {
                signals.push({
                    indicator: '布林通道',
                    value: `帶寬 ${bbWidth.toFixed(1)}%`,
                    signal: 'neutral',
                    label: '中性',
                    description: '價格在通道內運行'
                });
            }
        }

        // --- Moving Average Signal ---
        if (sma5[lastIdx] !== null && sma20[lastIdx] !== null) {
            const ma5Above20 = sma5[lastIdx] > sma20[lastIdx];
            const prevMa5Above20 = sma5[lastIdx - 1] > sma20[lastIdx - 1];
            const isGoldenCross = ma5Above20 && !prevMa5Above20;
            const isDeathCross = !ma5Above20 && prevMa5Above20;

            if (isGoldenCross || (currentPrice > sma5[lastIdx] && currentPrice > sma20[lastIdx])) {
                signals.push({
                    indicator: '均線 (MA5/MA20)',
                    value: `MA5: ${sma5[lastIdx].toFixed(2)}`,
                    signal: 'buy',
                    label: '買入',
                    description: isGoldenCross ? 'MA5 上穿 MA20 黃金交叉' : '價格站上短期與中期均線之上'
                });
                buyScore += 15;
            } else if (isDeathCross || (currentPrice < sma5[lastIdx] && currentPrice < sma20[lastIdx])) {
                signals.push({
                    indicator: '均線 (MA5/MA20)',
                    value: `MA5: ${sma5[lastIdx].toFixed(2)}`,
                    signal: 'sell',
                    label: '賣出',
                    description: isDeathCross ? 'MA5 下穿 MA20 死亡交叉' : '價格跌破短期與中期均線'
                });
                sellScore += 15;
            } else {
                signals.push({
                    indicator: '均線 (MA5/MA20)',
                    value: `MA5: ${sma5[lastIdx].toFixed(2)}`,
                    signal: 'neutral',
                    label: '中性',
                    description: '均線交織，趨勢不明'
                });
            }
        }

        // --- Volume Signal ---
        if (volumes.length >= 5) {
            const avgVol = volumes.slice(-20).reduce((a, b) => a + (b || 0), 0) / 20;
            const currentVol = volumes[lastIdx] || 0;
            const volRatio = currentVol / avgVol;

            if (volRatio > 1.5 && closes[lastIdx] > closes[lastIdx - 1]) {
                signals.push({
                    indicator: '成交量',
                    value: `${volRatio.toFixed(1)}x 均量`,
                    signal: 'buy',
                    label: '買入',
                    description: '量增價漲，多頭確認'
                });
                buyScore += 10;
            } else if (volRatio > 1.5 && closes[lastIdx] < closes[lastIdx - 1]) {
                signals.push({
                    indicator: '成交量',
                    value: `${volRatio.toFixed(1)}x 均量`,
                    signal: 'sell',
                    label: '賣出',
                    description: '量增價跌，空頭確認'
                });
                sellScore += 10;
            } else {
                signals.push({
                    indicator: '成交量',
                    value: `${volRatio.toFixed(1)}x 均量`,
                    signal: 'neutral',
                    label: '中性',
                    description: '成交量正常'
                });
            }
        }

        // Calculate overall score (0-100, 50 = neutral)
        const maxPossible = 100;
        const netScore = buyScore - sellScore;
        const overallScore = Math.round(50 + (netScore / maxPossible) * 50);

        // Determine action
        let action, actionClass;
        if (overallScore >= 65) {
            action = '建議買入';
            actionClass = 'buy';
        } else if (overallScore <= 35) {
            action = '建議賣出';
            actionClass = 'sell';
        } else {
            action = '建議持有';
            actionClass = 'hold';
        }

        // Risk analysis
        const volatility = calculateVolatility(closes.slice(-20));
        const trendStrength = calculateTrendStrength(closes, sma20);

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
                bollinger: {
                    upper: bollinger.upper[lastIdx],
                    middle: bollinger.middle[lastIdx],
                    lower: bollinger.lower[lastIdx],
                },
                sma: { sma5: sma5[lastIdx], sma10: sma10[lastIdx], sma20: sma20[lastIdx], sma60: sma60[lastIdx] },
            },
        };
    }

    /**
     * Calculate historical volatility
     */
    function calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push(Math.log(prices[i] / prices[i - 1]));
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
    }

    /**
     * Calculate trend strength (using ADX-like concept)
     */
    function calculateTrendStrength(prices, sma) {
        if (prices.length < 20) return 50;
        const lastIdx = prices.length - 1;
        const price = prices[lastIdx];
        const ma = sma[lastIdx];
        if (!ma) return 50;

        const deviation = Math.abs((price - ma) / ma) * 100;
        // Higher deviation = stronger trend
        return Math.min(100, deviation * 10);
    }

    return {
        calculateSMA,
        calculateEMA,
        calculateRSI,
        calculateMACD,
        calculateBollingerBands,
        generateSignals,
    };
})();
