<template>
  <div class="loading-overlay" :class="{ hidden: !loading }">
    <div class="loading-spinner">
      <div class="spinner-ring"></div>
      <span>載入中...</span>
    </div>
  </div>
</template>

<script setup>
const loading = useState('loading', () => false)
</script>
