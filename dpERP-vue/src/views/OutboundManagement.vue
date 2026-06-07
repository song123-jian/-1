<template>
  <div class="outbound-management-page">
    <OutboundSection />
  </div>
</template>

<script setup>
import OutboundSection from '@/components/inventory/OutboundSection.vue'
</script>

<style scoped>
.outbound-management-page {
  max-width: 1600px;
  margin: 0 auto;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .outbound-management-page {
    max-width: 100%;
  }
}
</style>
