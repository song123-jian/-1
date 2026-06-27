<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">系统管理</h2>
        <p class="page-header-subtitle">统一管理主题、数据、安全、权限与系统配置</p>
      </div>
      <button class="preview-toggle-btn" :class="{ active: showPreview }" @click="showPreview = !showPreview">
        <Icon name="eye" :size="14" />
        即时预览
      </button>
    </div>

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <Icon v-if="tab.icon" :name="tab.icon" :size="14" />
        {{ tab.label }}
      </button>
      <button
        v-if="activeTab === 'users'"
        class="tab-btn matrix-toggle-btn"
        :class="{ active: showMatrix }"
        @click="showMatrix = !showMatrix"
      >
        <Icon name="grid" :size="14" />
        权限矩阵
      </button>
    </div>

    <ThemeSettings v-if="activeTab === 'themes'" />
    <DataManagement v-if="activeTab === 'data'" />
    <UserManagement v-if="activeTab === 'users'" />

    <!-- 权限矩阵视图 -->
    <div v-if="activeTab === 'users' && showMatrix" class="permission-matrix">
      <div v-if="permStore.roles.length === 0" class="matrix-empty">
        <Icon name="alertCircle" :size="20" />
        <span>暂无角色数据，请先在用户管理中添加角色</span>
      </div>
      <div v-else-if="permStore.defaultModules.length === 0" class="matrix-empty">
        <Icon name="alertCircle" :size="20" />
        <span>暂无权限模块数据</span>
      </div>
      <div v-else class="matrix-scroll">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="matrix-corner">功能模块 \\ 角色</th>
              <th v-for="role in permStore.roles" :key="role">{{ role }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="mod in permStore.defaultModules" :key="mod.key">
              <tr v-for="(perm, idx) in mod.perms" :key="`${mod.key}.${perm}`">
                <td class="matrix-label" :class="{ 'module-first': idx === 0 }">
                  <span v-if="idx === 0" class="module-name">{{ mod.label }}</span>
                  <span class="perm-name">{{ permStore.permLabels[perm] || perm }}</span>
                </td>
                <td v-for="role in permStore.roles" :key="`${role}.${mod.key}.${perm}`" class="matrix-cell">
                  {{ permStore.getPerm(role, mod.key, perm) ? '✓' : '✗' }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <DataDictionary v-if="activeTab === 'dicts'" />

    <!-- 实时预览窗口 -->
    <div v-if="showPreview" class="preview-panel">
      <div class="preview-header">
        <span>实时预览</span>
        <button class="preview-close-btn" @click="showPreview = false">关闭</button>
      </div>
      <iframe src="/" class="preview-iframe" @error="previewError = true" />
      <div v-if="previewError" class="preview-error">
        <Icon name="alertCircle" :size="20" />
        <span>预览加载失败，请检查应用是否正常运行</span>
        <button class="btn btn-ghost btn-sm" @click="((previewError = false), (showPreview = false))">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'SystemManagement' }
</script>
<script setup>
import { ref, watch } from 'vue'
import { usePermissionStore } from '@/stores/permission'
import { useRoute, useRouter } from 'vue-router'
import ThemeSettings from '@/modules/system/components/system/ThemeSettings.vue'
import DataManagement from '@/modules/system/components/system/DataManagement.vue'
import UserManagement from '@/modules/system/components/system/UserManagement.vue'
import DataDictionary from '@/modules/system/components/system/DataDictionary.vue'

const route = useRoute()
const router = useRouter()
const permStore = usePermissionStore()

const showPreview = ref(false)
const showMatrix = ref(false)
const previewError = ref(false)

const tabs = [
  { key: 'themes', icon: 'palette', label: '主题管理' },
  { key: 'data', icon: 'save', label: '数据管理' },
  { key: 'users', icon: 'users', label: '用户管理' },
  { key: 'dicts', icon: 'list', label: '数据字典' }
]

const tabQueryMap = { themes: 'themes', data: 'data', users: 'users', dicts: 'dict' }
const queryTabMap = { themes: 'themes', data: 'data', users: 'users', dict: 'dicts' }

const activeTab = ref(queryTabMap[route.query.tab] || 'themes')

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && queryTabMap[newTab]) {
      activeTab.value = queryTabMap[newTab]
    }
  }
)

watch(activeTab, (newVal) => {
  const tabParam = tabQueryMap[newVal]
  if (route.query.tab !== tabParam) {
    router.replace({ path: '/system', query: { tab: tabParam } })
  }
})
</script>

<style scoped>
.tab-bar {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  flex-wrap: wrap;
  align-items: center;
}
.tab-btn {
  padding: var(--space-2) var(--space-4);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -var(--space-1);
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

/* 实时预览切换按钮 */
.preview-toggle-btn {
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.preview-toggle-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}
.preview-toggle-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

/* 权限矩阵切换按钮 */
.matrix-toggle-btn {
  margin-left: auto;
}

/* 权限矩阵 */
.permission-matrix {
  margin-bottom: var(--space-4);
}
.matrix-empty {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}
.matrix-scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.matrix-table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--font-size-xs);
}
.matrix-table th {
  border: 1px solid var(--color-border);
  padding: var(--space-1) var(--space-2);
  text-align: center;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.matrix-table td {
  border: 1px solid var(--color-border);
  padding: var(--space-1) var(--space-2);
  text-align: center;
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.matrix-table th {
  white-space: nowrap;
}
.matrix-table td {
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.matrix-table th {
  background: var(--color-bg-secondary);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: var(--z-base);
}
.matrix-corner {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--color-bg-secondary);
}
.matrix-label {
  text-align: left;
  position: sticky;
  left: 0;
  z-index: var(--z-base);
  background: var(--color-bg-primary);
  min-width: 120px;
}
.matrix-label.module-first {
  border-top: 2px solid var(--color-border);
}
.module-name {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-right: var(--space-2);
}
.perm-name {
  color: var(--color-text-secondary);
}
.matrix-cell {
  color: var(--color-text-secondary);
}

/* 实时预览面板 */
.preview-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 50%;
  height: 100vh;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}
.preview-close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-lg);
  padding: 0 var(--space-1);
  line-height: 1;
}
.preview-close-btn:hover {
  color: var(--color-text-primary);
}
.preview-iframe {
  flex: 1;
  width: 100%;
  border: none;
}
.preview-error {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  border-top: 1px solid var(--color-danger);
}

/* 鍝嶅簲寮忛€傞厤 */
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
  .preview-panel {
    width: 100%;
  }
}
</style>
