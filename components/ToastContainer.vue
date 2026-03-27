<template>
  <div class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="toast.type"
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
const { toasts } = useToast()
</script>
