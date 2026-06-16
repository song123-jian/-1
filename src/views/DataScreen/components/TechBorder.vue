<template>
  <div class="tech-border" :style="cssVars">
    <div class="tech-border__corner tech-border__corner--tl"></div>
    <div class="tech-border__corner tech-border__corner--tr"></div>
    <div class="tech-border__corner tech-border__corner--bl"></div>
    <div class="tech-border__corner tech-border__corner--br"></div>
    <div class="tech-border__glow-top" v-if="showGlow"></div>
    <div class="tech-border__content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  color: { type: String, default: '#00d4ff' },
  showGlow: { type: Boolean, default: true }
})

const cssVars = computed(() => ({
  '--tb-color': props.color
}))
</script>

<style scoped>
.tech-border {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.3s;
}
.tech-border:hover {
  border-color: rgba(255, 255, 255, 0.12);
}
.tech-border__corner {
  position: absolute;
  width: 12px;
  height: 12px;
  z-index: 1;
}
.tech-border__corner--tl { top: 0; left: 0; border-top: 2px solid var(--tb-color); border-left: 2px solid var(--tb-color); }
.tech-border__corner--tr { top: 0; right: 0; border-top: 2px solid var(--tb-color); border-right: 2px solid var(--tb-color); }
.tech-border__corner--bl { bottom: 0; left: 0; border-bottom: 2px solid var(--tb-color); border-left: 2px solid var(--tb-color); }
.tech-border__corner--br { bottom: 0; right: 0; border-bottom: 2px solid var(--tb-color); border-right: 2px solid var(--tb-color); }
.tech-border__glow-top {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--tb-color), transparent);
  opacity: 0.6;
}
.tech-border__content {
  position: relative;
  z-index: 0;
  height: 100%;
}
</style>
