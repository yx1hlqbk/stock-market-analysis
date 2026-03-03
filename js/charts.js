/**
 * StockPulse — Charts Module
 * Renders candlestick charts, volume, and indicator charts using Lightweight Charts
 */

const Charts = (() => {
    let mainChart = null;
    let mainSeries = null;
    let volumeSeries = null;
    let volumeChart = null;
    let maSeries = {};
    let rsiChart = null;
    let macdChart = null;
    let bollingerChart = null;

    const CHART_COLORS = {
        background: '#111827',
        textColor: '#94a3b8',
        gridColor: 'rgba(255,255,255,0.04)',
        upColor: '#22c55e',
        downColor: '#ef4444',
        ma5Color: '#f59e0b',
        ma10Color: '#6C5CE7',
        ma20Color: '#00D2FF',
        ma60Color: '#ec4899',
    };

    /**
     * Common chart options
     */
    function getBaseOptions(container) {
        return {
            width: container.clientWidth,
            height: container.clientHeight || 400,
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: CHART_COLORS.textColor,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: CHART_COLORS.gridColor },
                horzLines: { color: CHART_COLORS.gridColor },
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    labelBackgroundColor: '#6C5CE7',
                },
                horzLine: {
                    labelBackgroundColor: '#6C5CE7',
                },
            },
            timeScale: {
                borderColor: 'rgba(255,255,255,0.06)',
                timeVisible: false,
            },
            rightPriceScale: {
                borderColor: 'rgba(255,255,255,0.06)',
            },
            handleScroll: true,
            handleScale: true,
        };
    }

    /**
     * Render main candlestick chart
     */
    function renderCandlestickChart(container, data) {
        // Clear existing
        if (mainChart) {
            mainChart.remove();
            mainChart = null;
        }
        container.innerHTML = '';

        mainChart = LightweightCharts.createChart(container, getBaseOptions(container));

        mainSeries = mainChart.addCandlestickSeries({
            upColor: CHART_COLORS.upColor,
            downColor: CHART_COLORS.downColor,
            borderUpColor: CHART_COLORS.upColor,
            borderDownColor: CHART_COLORS.downColor,
            wickUpColor: CHART_COLORS.upColor,
            wickDownColor: CHART_COLORS.downColor,
        });

        const candleData = data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        mainSeries.setData(candleData);
        mainChart.timeScale().fitContent();

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            mainChart.applyOptions({ width: container.clientWidth });
        });
        resizeObserver.observe(container);

        return mainChart;
    }

    /**
     * Render volume chart
     */
    function renderVolumeChart(container, data) {
        if (volumeChart) {
            volumeChart.remove();
            volumeChart = null;
        }
        container.innerHTML = '';

        volumeChart = LightweightCharts.createChart(container, {
            ...getBaseOptions(container),
            height: container.clientHeight || 100,
        });

        volumeSeries = volumeChart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });

        const volData = data.map(d => ({
            time: d.time,
            value: d.volume || 0,
            color: d.close >= d.open
                ? 'rgba(34, 197, 94, 0.4)'
                : 'rgba(239, 68, 68, 0.4)',
        }));

        volumeSeries.setData(volData);
        volumeChart.timeScale().fitContent();

        // Sync time scale
        if (mainChart) {
            mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                if (range && volumeChart) {
                    volumeChart.timeScale().setVisibleLogicalRange(range);
                }
            });
            volumeChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                if (range && mainChart) {
                    mainChart.timeScale().setVisibleLogicalRange(range);
                }
            });
        }

        const resizeObserver = new ResizeObserver(() => {
            volumeChart.applyOptions({ width: container.clientWidth });
        });
        resizeObserver.observe(container);
    }

    /**
     * Add Moving Average lines to main chart
     */
    function addMovingAverages(data, options = {}) {
        if (!mainChart) return;

        // Remove existing MAs
        Object.keys(maSeries).forEach(key => {
            try { mainChart.removeSeries(maSeries[key]); } catch (e) { }
        });
        maSeries = {};

        const closes = data.map(d => d.close);
        const times = data.map(d => d.time);

        const maConfigs = [
            { key: 'ma5', period: 5, color: CHART_COLORS.ma5Color, enabled: options.ma5 !== false },
            { key: 'ma10', period: 10, color: CHART_COLORS.ma10Color, enabled: options.ma10 !== false },
            { key: 'ma20', period: 20, color: CHART_COLORS.ma20Color, enabled: options.ma20 !== false },
            { key: 'ma60', period: 60, color: CHART_COLORS.ma60Color, enabled: options.ma60 === true },
        ];

        maConfigs.forEach(({ key, period, color, enabled }) => {
            if (!enabled) return;

            const sma = Indicators.calculateSMA(closes, period);
            const lineData = sma.map((val, i) => {
                if (val === null) return null;
                return { time: times[i], value: val };
            }).filter(Boolean);

            if (lineData.length > 0) {
                const series = mainChart.addLineSeries({
                    color,
                    lineWidth: 1.5,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    crosshairMarkerVisible: false,
                });
                series.setData(lineData);
                maSeries[key] = series;
            }
        });
    }

    /**
     * Render RSI chart
     */
    function renderRSIChart(container, data) {
        if (rsiChart) {
            rsiChart.remove();
            rsiChart = null;
        }
        container.innerHTML = '';

        rsiChart = LightweightCharts.createChart(container, {
            ...getBaseOptions(container),
            height: container.clientHeight || 200,
        });

        const closes = data.map(d => d.close);
        const times = data.map(d => d.time);
        const rsiValues = Indicators.calculateRSI(closes);

        // RSI Line
        const rsiSeries = rsiChart.addLineSeries({
            color: '#6C5CE7',
            lineWidth: 2,
            priceLineVisible: false,
        });

        const rsiData = rsiValues.map((val, i) => {
            if (val === null) return null;
            return { time: times[i], value: val };
        }).filter(Boolean);

        rsiSeries.setData(rsiData);

        // Overbought/Oversold zones (as horizontal lines)
        const overbought = rsiChart.addLineSeries({
            color: 'rgba(239, 68, 68, 0.3)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        overbought.setData(rsiData.map(d => ({ time: d.time, value: 70 })));

        const oversold = rsiChart.addLineSeries({
            color: 'rgba(34, 197, 94, 0.3)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        oversold.setData(rsiData.map(d => ({ time: d.time, value: 30 })));

        rsiChart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver(() => {
            rsiChart.applyOptions({ width: container.clientWidth });
        });
        resizeObserver.observe(container);

        return rsiValues[rsiValues.length - 1];
    }

    /**
     * Render MACD chart
     */
    function renderMACDChart(container, data) {
        if (macdChart) {
            macdChart.remove();
            macdChart = null;
        }
        container.innerHTML = '';

        macdChart = LightweightCharts.createChart(container, {
            ...getBaseOptions(container),
            height: container.clientHeight || 200,
        });

        const closes = data.map(d => d.close);
        const times = data.map(d => d.time);
        const macdData = Indicators.calculateMACD(closes);

        // MACD Histogram
        const histSeries = macdChart.addHistogramSeries({
            priceFormat: { type: 'price', precision: 2 },
            priceLineVisible: false,
        });

        const histData = macdData.histogram.map((val, i) => {
            if (val === null) return null;
            return {
                time: times[i],
                value: val,
                color: val >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            };
        }).filter(Boolean);

        histSeries.setData(histData);

        // MACD Line
        const macdLine = macdChart.addLineSeries({
            color: '#6C5CE7',
            lineWidth: 1.5,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const macdLineData = macdData.macd.map((val, i) => {
            if (val === null) return null;
            return { time: times[i], value: val };
        }).filter(Boolean);
        macdLine.setData(macdLineData);

        // Signal Line
        const signalLine = macdChart.addLineSeries({
            color: '#f59e0b',
            lineWidth: 1.5,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const signalData = macdData.signal.map((val, i) => {
            if (val === null) return null;
            return { time: times[i], value: val };
        }).filter(Boolean);
        signalLine.setData(signalData);

        macdChart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver(() => {
            macdChart.applyOptions({ width: container.clientWidth });
        });
        resizeObserver.observe(container);

        const lastIdx = macdData.macd.length - 1;
        return macdData.macd[lastIdx];
    }

    /**
     * Render Bollinger Bands chart
     */
    function renderBollingerChart(container, data) {
        if (bollingerChart) {
            bollingerChart.remove();
            bollingerChart = null;
        }
        container.innerHTML = '';

        bollingerChart = LightweightCharts.createChart(container, {
            ...getBaseOptions(container),
            height: container.clientHeight || 200,
        });

        const closes = data.map(d => d.close);
        const times = data.map(d => d.time);
        const bb = Indicators.calculateBollingerBands(closes);

        // Price line
        const priceLine = bollingerChart.addLineSeries({
            color: '#f1f5f9',
            lineWidth: 1.5,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        priceLine.setData(closes.map((v, i) => ({ time: times[i], value: v })));

        // Upper band
        const upperLine = bollingerChart.addLineSeries({
            color: 'rgba(239, 68, 68, 0.6)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        const upperData = bb.upper.map((val, i) => {
            if (val === null) return null;
            return { time: times[i], value: val };
        }).filter(Boolean);
        upperLine.setData(upperData);

        // Middle band
        const middleLine = bollingerChart.addLineSeries({
            color: 'rgba(0, 210, 255, 0.5)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        const middleData = bb.middle.map((val, i) => {
            if (val === null) return null;
            return { time: times[i], value: val };
        }).filter(Boolean);
        middleLine.setData(middleData);

        // Lower band
        const lowerLine = bollingerChart.addLineSeries({
            color: 'rgba(34, 197, 94, 0.6)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        const lowerData = bb.lower.map((val, i) => {
            if (val === null) return null;
            return { time: times[i], value: val };
        }).filter(Boolean);
        lowerLine.setData(lowerData);

        bollingerChart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver(() => {
            bollingerChart.applyOptions({ width: container.clientWidth });
        });
        resizeObserver.observe(container);

        const lastIdx = bb.upper.length - 1;
        return bb.upper[lastIdx] ? `${bb.lower[lastIdx].toFixed(1)} - ${bb.upper[lastIdx].toFixed(1)}` : '--';
    }

    /**
     * Cleanup all charts
     */
    function destroyAll() {
        [mainChart, volumeChart, rsiChart, macdChart, bollingerChart].forEach(chart => {
            if (chart) {
                try { chart.remove(); } catch (e) { }
            }
        });
        mainChart = volumeChart = rsiChart = macdChart = bollingerChart = null;
        maSeries = {};
    }

    return {
        renderCandlestickChart,
        renderVolumeChart,
        addMovingAverages,
        renderRSIChart,
        renderMACDChart,
        renderBollingerChart,
        destroyAll,
    };
})();
