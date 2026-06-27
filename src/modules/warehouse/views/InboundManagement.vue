<template>
  <div class="inbound-management-page">
    <div class="page-header" style="margin-bottom: var(--space-4)">
      <div>
        <h2 class="page-header-title">入库管理</h2>
        <p class="page-header-subtitle">从采购、退货到调拨入库，统一登记和跟踪状态变化</p>
      </div>
    </div>
    <InboundSection ref="inboundRef" @quick-outbound="handleQuickOutbound" />
  </div>
</template>

<script>
export default { name: 'InboundManagement' }
</script>
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import InboundSection from '@/modules/warehouse/components/inventory/InboundSection.vue'

const router = useRouter()
const route = useRoute()
const inboundRef = ref(null)

function handleQuickOutbound() {
  router.push('/outbound').catch(() => {})
}

/* 接收路由参数并自动填充物料信息 */
onMounted(() => {
  const { materialCode, materialName } = route.query
  if (materialCode && inboundRef.value) {
    // InboundSection 暴露了 prefillMaterial 方法用于预填充
    if (typeof inboundRef.value.prefillMaterial === 'function') {
      inboundRef.value.prefillMaterial({ code: materialCode, name: materialName })
    }
  }
})
</script>

<style scoped>
.inbound-management-page {
  width: 100%;
}
</style>
