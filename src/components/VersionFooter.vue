<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const currentVersion = ref<string>('')
const hasNewVersion = ref(false)
const isChecking = ref(false)

// Check for updates every 5 minutes
const CHECK_INTERVAL = 5 * 60 * 1000

let checkInterval: number | null = null

async function fetchVersion() {
  try {
    // Add cache busting to ensure we get the latest version
    const response = await fetch(`/version.json?t=${Date.now()}`)
    const data = await response.json()
    return data.version
  } catch (error) {
    console.error('Error fetching version:', error)
    return null
  }
}

async function checkForUpdates() {
  if (isChecking.value) return
  
  isChecking.value = true
  try {
    const latestVersion = await fetchVersion()
    if (latestVersion && currentVersion.value && latestVersion !== currentVersion.value) {
      hasNewVersion.value = true
    }
  } finally {
    isChecking.value = false
  }
}

function reloadPage() {
  // Clear cache and reload
  window.location.reload()
}

onMounted(async () => {
  // Get initial version
  const version = await fetchVersion()
  if (version) {
    currentVersion.value = version
  }
  
  // Start checking for updates
  checkInterval = window.setInterval(checkForUpdates, CHECK_INTERVAL)
})

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})
</script>

<template>
  <div class="">
    <!-- Update notification -->
    <div 
      v-if="hasNewVersion"
      class="update-notification"
      @click="reloadPage"
    >
      <div class="update-content">
        <span class="update-icon">🚀</span>
        <span class="update-text">Nueva versión disponible. Click para actualizar</span>
      </div>
    </div>
    
    <!-- Version footer -->
    <div class="version-footer">
      <span class="version-text">v{{ currentVersion }}</span>
    </div>
  </div>
</template>

<style scoped>
.update-notification {
  background: linear-gradient(135deg, #00ff87 0%, #60efff 100%);
  padding: 12px 16px;
  text-align: center;
  cursor: pointer;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 -4px 20px rgba(0, 255, 135, 0.4);
}

.update-notification:hover {
  background: linear-gradient(135deg, #00ff87 0%, #60efff 50%, #a855f7 100%);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}

.update-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  color: #0a0a15;
  font-size: 14px;
}

.update-icon {
  font-size: 20px;
  animation: bounce 1s ease-in-out infinite;
}

.update-text {
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
}

.version-footer {
  /* background: rgba(10, 10, 21, 0.8); */
  /* backdrop-filter: blur(8px); */
  padding: 6px 12px;
  text-align: center;
  /* border-top: 1px solid rgba(255, 255, 255, 0.1); */
}

.version-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.5px;
  font-family: 'Courier New', monospace;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
</style>
