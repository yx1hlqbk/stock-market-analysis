import { LayoutDashboard, CandlestickChart, Zap, Menu, Search, Plus, RefreshCw, Trash2, X, Inbox, AlertCircle } from 'lucide-vue-next'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('IconLayoutDashboard', LayoutDashboard)
  nuxtApp.vueApp.component('IconCandlestickChart', CandlestickChart)
  nuxtApp.vueApp.component('IconZap', Zap)
  nuxtApp.vueApp.component('IconMenu', Menu)
  nuxtApp.vueApp.component('IconSearch', Search)
  nuxtApp.vueApp.component('IconPlus', Plus)
  nuxtApp.vueApp.component('IconRefreshCw', RefreshCw)
  nuxtApp.vueApp.component('IconTrash2', Trash2)
  nuxtApp.vueApp.component('IconX', X)
  nuxtApp.vueApp.component('IconInbox', Inbox)
  nuxtApp.vueApp.component('IconAlertCircle', AlertCircle)
})
