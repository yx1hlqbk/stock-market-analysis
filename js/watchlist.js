/**
 * StockPulse — Watchlist Manager
 * Manages stock tracking list with LocalStorage persistence
 */

const Watchlist = (() => {
    const STORAGE_KEY = 'stockpulse_watchlist';

    /**
     * Get watchlist from LocalStorage
     * @returns {Array<{symbol: string, name: string, addedAt: number}>}
     */
    function getList() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Save watchlist to LocalStorage
     */
    function saveList(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    /**
     * Add a stock to watchlist
     */
    function addStock(symbol, name) {
        const list = getList();
        const code = symbol.replace('.TW', '').replace('.TWO', '').trim();

        // Check duplicate
        if (list.some(s => s.symbol === code)) {
            return { success: false, message: `${code} 已在追蹤清單中` };
        }

        list.push({
            symbol: code,
            name: name || StockAPI.getStockName(code),
            addedAt: Date.now(),
        });

        saveList(list);
        return { success: true, message: `已加入 ${code} ${name || ''}` };
    }

    /**
     * Remove a stock from watchlist
     */
    function removeStock(symbol) {
        let list = getList();
        const code = symbol.replace('.TW', '').replace('.TWO', '').trim();
        list = list.filter(s => s.symbol !== code);
        saveList(list);
        return { success: true, message: `已移除 ${code}` };
    }

    /**
     * Check if stock is in watchlist
     */
    function isTracked(symbol) {
        const code = symbol.replace('.TW', '').replace('.TWO', '').trim();
        return getList().some(s => s.symbol === code);
    }

    /**
     * Get all symbols
     */
    function getSymbols() {
        return getList().map(s => s.symbol);
    }

    /**
     * Get count
     */
    function getCount() {
        return getList().length;
    }

    return {
        getList,
        addStock,
        removeStock,
        isTracked,
        getSymbols,
        getCount,
    };
})();
