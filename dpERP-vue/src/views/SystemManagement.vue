<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">系统管理</h2>
        <p class="page-header-subtitle">主题管理、数据备份恢复、用户权限配置、数据字典维护</p>
      </div>
    </div>

    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key"><Icon v-if="tab.icon" :name="tab.icon" :size="14" /> {{ tab.label }}</button>
    </div>

    <ThemeSettings v-if="activeTab === 'themes'" />
    <DataManagement v-if="activeTab === 'data'" />
    <UserManagement v-if="activeTab === 'users'" />
    <DataDictionary v-if="activeTab === 'dicts'" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useRoute, useRouter } from 'vue-router'
import ThemeSettings from '@/components/system/ThemeSettings.vue'
import DataManagement from '@/components/system/DataManagement.vue'
import UserManagement from '@/components/system/UserManagement.vue'
import DataDictionary from '@/components/system/DataDictionary.vue'

const route = useRoute()
const router = useRouter()
const sysStore = useSystemStore()

const tabs = [
  { key: 'themes', icon: 'palette', label: '主题管理' },
  { key: 'data', icon: 'save', label: '数据管理' },
  { key: 'users', icon: 'users', label: '用户管理' },
  { key: 'dicts', icon: 'list', label: '数据字典' }
]

const tabQueryMap = { themes: 'themes', data: 'data', users: 'users', dicts: 'dict' }
const queryTabMap = { themes: 'themes', data: 'data', users: 'users', dict: 'dicts' }

const activeTab = ref(queryTabMap[route.query.tab] || 'themes')

watch(() => route.query.tab, (newTab) => {
  if (newTab && queryTabMap[newTab]) {
    activeTab.value = queryTabMap[newTab]
  }
})

watch(activeTab, (newVal) => {
  const tabParam = tabQueryMap[newVal]
  if (route.query.tab !== tabParam) {
    router.replace({ path: '/system', query: { tab: tabParam } })
  }
})

onMounted(() => {
  sysStore.initSeedData()
})
</script>

<style scoped>
.tab-bar {
  display: flex; gap: var(--space-1); margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border); flex-wrap: wrap;
}
.tab-btn {
  padding: var(--space-2) var(--space-4); background: none; border: none;
  color: var(--color-text-secondary); font-size: var(--font-size-sm); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all var(--transition-fast);
}
.tab-btn:hover { color: var(--color-text-primary); }
.tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }

/* 响应式适配 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .tab-bar {
    flex-wrap: wrap;
  }
  .tab-btn {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-xs);
  }
}
</style>
