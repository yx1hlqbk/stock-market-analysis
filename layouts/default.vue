<template>
  <div>
    <AppSidebar />

    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      />
    </Transition>

    <button class="mobile-nav-toggle" @click="sidebarOpen = !sidebarOpen">
      <IconMenu />
    </button>

    <main class="main-content" @click="sidebarOpen = false">
      <AppTopbar />
      <slot />
    </main>

    <LoadingOverlay />
    <ToastContainer />
  </div>
</template>

<script setup>
const sidebarOpen = useState('sidebarOpen', () => false)
</script>
