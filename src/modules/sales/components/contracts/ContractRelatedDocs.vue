<template>
  <div class="preview-related">
    <div class="related-section">
      <div class="related-section-title">
        <Icon name="list" :size="14" />
        关联报价单
      </div>
      <div v-if="relatedDocuments.quotations.length === 0" class="empty-hint">暂无关联报价单</div>
      <div v-for="doc in relatedDocuments.quotations" :key="doc.id" class="related-doc-item">
        <div class="related-doc-icon"><Icon :name="doc.typeIcon" :size="14" /></div>
        <div class="related-doc-main">
          <div class="related-doc-header">
            <span class="related-doc-no">{{ doc.docNo }}</span>
            <span class="status-badge" :class="'status-' + doc.status">{{ doc.statusLabel }}</span>
          </div>
          <div class="related-doc-meta">
            <span>{{ doc.customerName }}</span>
            <span class="mono">¥{{ formatNumber(doc.amount) }}</span>
            <span>{{ doc.date }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="related-section">
      <div class="related-section-title">
        <Icon name="truck" :size="14" />
        关联交付单
      </div>
      <div v-if="relatedDocuments.deliveries.length === 0" class="empty-hint">暂无关联交付单</div>
      <div v-for="doc in relatedDocuments.deliveries" :key="doc.id" class="related-doc-item">
        <div class="related-doc-icon"><Icon :name="doc.typeIcon" :size="14" /></div>
        <div class="related-doc-main">
          <div class="related-doc-header">
            <span class="related-doc-no">{{ doc.docNo }}</span>
            <span class="status-badge" :class="'status-' + doc.status">{{ doc.statusLabel }}</span>
          </div>
          <div class="related-doc-meta">
            <span>{{ doc.customerName }}</span>
            <span class="mono">¥{{ formatNumber(doc.amount) }}</span>
            <span>{{ doc.date }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="related-section">
      <div class="related-section-title">
        <Icon name="dollar" :size="14" />
        关联回款单
      </div>
      <div v-if="relatedDocuments.collections.length === 0" class="empty-hint">暂无关联回款单</div>
      <div v-for="doc in relatedDocuments.collections" :key="doc.id" class="related-doc-item">
        <div class="related-doc-icon"><Icon :name="doc.typeIcon" :size="14" /></div>
        <div class="related-doc-main">
          <div class="related-doc-header">
            <span class="related-doc-no">{{ doc.docNo }}</span>
            <span class="status-badge" :class="'status-' + doc.status">{{ doc.statusLabel }}</span>
          </div>
          <div class="related-doc-meta">
            <span>{{ doc.customerName }}</span>
            <span class="mono">¥{{ formatNumber(doc.amount) }}</span>
            <span>{{ doc.date }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ContractRelatedDocs' }
</script>
<script setup>
import { formatNumber } from '@/utils/format'
defineProps({
  relatedDocuments: {
    type: Object,
    default: () => ({ quotations: [], deliveries: [], collections: [] })
  }
})
</script>

<style scoped>
.preview-related {
  padding: 0;
}
.related-section {
  margin-bottom: var(--space-6);
}
.related-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.related-doc-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  transition: background 0.15s;
  cursor: pointer;
}
.related-doc-item:hover {
  background: var(--color-bg-secondary);
}
.related-doc-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.related-doc-main {
  flex: 1;
  min-width: 0;
}
.related-doc-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.related-doc-no {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 13px;
}
.related-doc-meta {
  display: flex;
  gap: var(--space-4);
  font-size: 12px;
  color: var(--color-text-secondary);
}
.mono {
  font-family: var(--font-mono);
}
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-draft {
  background: rgba(100, 116, 139, 0.2);
  color: #94a3b8;
}
.status-pending_approval {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}
.status-approved {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}
.status-signed {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}
.status-archived {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
}
.status-cancelled {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}
.empty-hint {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-5);
}
</style>
