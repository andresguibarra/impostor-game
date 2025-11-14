<script setup lang="ts">
import VersionFooter from './components/VersionFooter.vue'
</script>

<template>
  <div class="flex flex-col justify-center items-center min-h-screen dark-impostor-bg-main px-2 pt-10 pb-0 relative overflow-hidden">
    <router-view />
    <VersionFooter />
  </div>
</template>

<style scoped>
.dark-impostor-bg-main {
  background: linear-gradient(135deg, 
    #0a0a15 0%, 
    #1a1a2e 25%, 
    #16213e 50%, 
    #1a1a2e 75%, 
    #0a0a15 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
</style>

