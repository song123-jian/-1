<template>
  <div class="outbound-management-page">
    <div class="page-header" style="margin-bottom: var(--space-4)">
      <div>
        <h2 class="page-header-title">出库管理</h2>
        <p class="page-header-subtitle">统一处理销售出库、调拨出库和发货跟踪</p>
      </div>
    </div>
    <OutboundSection />
  </div>
</template>

<script>
export default { name: 'OutboundManagement' }
</script>
<script setup>
import OutboundSection from '@/modules/warehouse/components/inventory/OutboundSection.vue'
</script>

<style scoped>
.outbound-management-page {
}

/* 响应式适配 */
@media (max-width: 768px) {
  .outbound-management-page {
    max-width: 100%;
  }
}
</style>
