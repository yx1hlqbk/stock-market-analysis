export default defineNuxtConfig({
  ssr: false,

  future: {
    compatibilityVersion: 4,
  },

  app: {
    head: {
      title: 'StockPulse — 智能股票追蹤與分析平台',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'StockPulse 提供即時股票報價、K 線圖分析、技術指標計算與買賣建議，助您做出更聰明的投資決策。' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-01-01',
})
