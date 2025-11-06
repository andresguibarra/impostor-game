<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'back'
  disabled?: boolean
  icon?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  disabled: false,
  size: 'lg'
})

const emit = defineEmits<{
  click: []
}>()

const baseClasses = 'font-black rounded-3xl transition-all cursor-pointer backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed'

const sizeClasses = {
  sm: 'py-3 px-5 text-base',
  md: 'py-4 px-6 text-xl',
  lg: 'py-5 px-6 text-2xl'
}

const variantClasses = {
  primary: 'bg-gradient-to-br from-amber-500/90 to-amber-600/95 border-3 border-amber-300/80 text-white shadow-[0_0_20px_rgba(245,158,11,0.5),0_4px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.7),0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_15px_rgba(245,158,11,0.4),0_2px_10px_rgba(0,0,0,0.3)]',
  secondary: 'bg-gradient-to-br from-cyan-500/90 to-cyan-600/95 border-3 border-cyan-300/80 text-white shadow-[0_0_20px_rgba(6,182,212,0.5),0_4px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7),0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_15px_rgba(6,182,212,0.4),0_2px_10px_rgba(0,0,0,0.3)]',
  success: 'bg-gradient-to-br from-green-500/90 to-green-700/95 border-3 border-green-300/80 text-white shadow-[0_0_20px_rgba(34,197,94,0.5),0_4px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.7),0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_15px_rgba(34,197,94,0.4),0_2px_10px_rgba(0,0,0,0.3)]',
  back: 'bg-gradient-to-br from-slate-600/70 to-slate-700/80 border-2 border-slate-400/50 text-slate-200 shadow-[0_0_10px_rgba(71,85,105,0.3),0_4px_12px_rgba(0,0,0,0.25)] hover:shadow-[0_0_15px_rgba(71,85,105,0.4),0_5px_15px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_8px_rgba(71,85,105,0.3),0_2px_8px_rgba(0,0,0,0.2)]'
}

const textShadowClasses = {
  primary: '[text-shadow:0_0_10px_rgba(251,191,36,0.8),0_0_20px_rgba(245,158,11,0.6),2px_2px_4px_rgba(0,0,0,0.5)]',
  secondary: '[text-shadow:0_0_10px_rgba(103,232,249,0.8),0_0_20px_rgba(6,182,212,0.6),2px_2px_4px_rgba(0,0,0,0.5)]',
  success: '[text-shadow:0_0_10px_rgba(134,239,172,0.8),0_0_20px_rgba(34,197,94,0.6),2px_2px_4px_rgba(0,0,0,0.5)]',
  back: '[text-shadow:0_1px_2px_rgba(0,0,0,0.5)]'
}

const buttonClasses = `${baseClasses} ${sizeClasses[props.size]} ${variantClasses[props.variant]} ${textShadowClasses[props.variant]}`
</script>

<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    @click="emit('click')"
  >
    <span v-if="icon" class="text-3xl mr-3">{{ icon }}</span>
    <slot />
  </button>
</template>
