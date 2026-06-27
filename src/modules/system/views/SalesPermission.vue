<template>
  <div class="permission-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">客户权限配置</h2>
        <p class="page-header-subtitle">配置客户数据的访问权限、编辑权限和操作权限</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="saveAll">
          <Icon name="save" :size="14" />
          保存修改
        </button>
        <button class="btn btn-secondary" @click="resetAll">
          <Icon name="chevronLeft" :size="14" />
          恢复默认
        </button>
        <button class="btn btn-ghost" @click="openAddRoleModal">新增角色</button>
        <div style="position: relative; display: inline-block">
          <button class="btn btn-ghost" @click="showTemplateDropdown = !showTemplateDropdown">
            <Icon name="list" :size="14" />
            权限模板 ▾
          </button>
          <div
            v-if="showTemplateDropdown"
            style="
              position: absolute;
              right: 0;
              top: 100%;
              z-index: var(--z-dropdown);
              background: var(--color-surface-elevated);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-md);
              box-shadow: var(--shadow-lg);
              min-width: 200px;
            "
          >
            <div
              style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--color-border)"
              @click="(applyTemplate('strict'), (showTemplateDropdown = false))"
            >
              <div style="font-weight: 600">严格模式</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
                仅管理员全权限，其他角色仅查看
              </div>
            </div>
            <div
              style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--color-border)"
              @click="(applyTemplate('standard'), (showTemplateDropdown = false))"
            >
              <div style="font-weight: 600">标准模式</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
                按角色分级授权，推荐使用
              </div>
            </div>
            <div
              style="padding: 8px 12px; cursor: pointer"
              @click="(applyTemplate('loose'), (showTemplateDropdown = false))"
            >
              <div style="font-weight: 600">宽松模式</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">全部角色全部权限</div>
            </div>
          </div>
        </div>
        <button class="btn btn-ghost" @click="doExport">
          <Icon name="download" :size="14" />
          导出
        </button>
        <button class="btn btn-ghost" @click="showImportModal = true">
          <Icon name="upload" :size="14" />
          导入
        </button>
        <button
          class="btn btn-ghost"
          style="
            border-radius: 50%;
            width: 32px;
            height: 32px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          @click="showHelp = !showHelp"
        >
          ?
        </button>
      </div>
    </div>

    <div class="stats-row" style="margin-bottom: var(--space-4)">
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
          用户
        </div>
        <div class="stat-card-value">{{ permStore.roleCount }}</div>
        <div class="stat-card-label">角色总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
          权限
        </div>
        <div class="stat-card-value">{{ permStore.totalPerms }}</div>
        <div class="stat-card-label">权限项数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
          编辑
        </div>
        <div class="stat-card-value">{{ permStore.changeCount }}</div>
        <div class="stat-card-label">待保存变更</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">时间</div>
        <div class="stat-card-value" style="font-size: var(--font-size-sm)">{{ permStore.lastSaved || '未保存' }}</div>
        <div class="stat-card-label">最近修改时间</div>
      </div>
    </div>

    <!-- 角色标签列表 -->
    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-4)">
      <span v-for="role in permStore.roles" :key="role" class="role-chip">
        {{ role }}
        <span
          v-if="permStore.getRolePermStats(role)"
          style="font-size: 10px; color: var(--color-text-tertiary); margin-left: 4px"
        >
          {{ permStore.getRolePermStats(role).percentage }}%
        </span>
        <button v-if="!['管理员', '总经理'].includes(role)" class="role-chip-remove" @click="removeRole(role)">
          <Icon name="close" :size="14" />
        </button>
      </span>
    </div>

    <div class="filter-bar" style="margin-bottom: var(--space-4)">
      <input v-model="permSearch" type="text" class="form-input" placeholder="搜索权限项..." />
      <select v-model="permModuleFilter" class="form-select">
        <option value="">全部模块</option>
        <option value="quote_contract">报价/合同</option>
        <option value="inbound">入库</option>
        <option value="outbound">出库</option>
        <option value="statement">对账</option>
        <option value="delivery">送货</option>
        <option value="cost">成本核算</option>
      </select>
      <!-- 批量操作 -->
      <select v-model="batchAction" class="form-select" style="width: auto">
        <option value="">批量操作</option>
        <option value="enableView">开启所有查看权限</option>
        <option value="enableCreate">开启所有创建权限</option>
        <option value="disableDelete">关闭所有删除权限</option>
        <option value="disableExport">关闭所有导出权限</option>
      </select>
      <button class="btn btn-ghost btn-sm" :disabled="!batchAction" @click="doBatchAction">应用</button>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">权限矩阵</span>
        <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-left: auto">
          {{ permSummaryText }}
        </span>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container" style="overflow-x: auto">
          <table class="data-table perm-matrix-table">
            <thead>
              <tr>
                <th
                  style="
                    min-width: 120px;
                    position: sticky;
                    left: 0;
                    background: var(--color-surface-elevated);
                    z-index: var(--z-base);
                  "
                >
                  模块 / 权限
                </th>
                <th v-for="role in permStore.roles" :key="role" style="min-width: 100px; text-align: center">
                  <div>{{ role }}</div>
                  <div style="font-size: 9px; color: var(--color-text-tertiary); font-weight: 400">
                    {{ getRolePermPercent(role) }}%
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="mod in filteredModules" :key="mod.key">
                <tr class="module-header-row" style="cursor: pointer" @click="toggleModuleExpand(mod.key)">
                  <td
                    style="
                      font-weight: 600;
                      position: sticky;
                      left: 0;
                      background: var(--color-surface-elevated);
                      z-index: var(--z-base);
                      overflow-wrap: break-word;
                      word-wrap: break-word;
                    "
                  >
                    {{ mod.label }} ({{ mod.perms.length }}项)
                    <span style="margin-left: 4px; font-size: 10px; color: var(--color-text-tertiary)">
                      {{ getModulePermPercent(mod.key) }}%
                    </span>
                    <span style="float: right">{{ expandedModules.has(mod.key) ? '▾' : '▸' }}</span>
                  </td>
                  <td v-for="role in permStore.roles" :key="role" style="text-align: center">
                    <label style="cursor: pointer" @click.prevent="toggleModuleAll(role, mod)">
                      <input
                        type="checkbox"
                        :checked="isModuleAllChecked(role, mod)"
                        :indeterminate.prop="isModulePartial(role, mod)"
                      />
                    </label>
                  </td>
                </tr>
                <tr v-for="perm in mod.perms" v-show="expandedModules.has(mod.key)" :key="mod.key + '.' + perm">
                  <td
                    style="
                      padding-left: var(--space-6);
                      position: sticky;
                      left: 0;
                      background: var(--color-surface);
                      z-index: var(--z-base);
                      overflow-wrap: break-word;
                      word-wrap: break-word;
                    "
                  >
                    {{ permStore.permLabels[perm] || perm }}
                    <span class="perm-category-badge" :class="getPermCategory(perm)">
                      {{ getPermCategoryLabel(perm) }}
                    </span>
                  </td>
                  <td v-for="role in permStore.roles" :key="role" style="text-align: center">
                    <label style="cursor: pointer">
                      <input
                        type="checkbox"
                        :checked="permStore.getPerm(role, mod.key, perm)"
                        @change="onPermChange(role, mod.key, perm, $event.target.checked)"
                      />
                    </label>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 权限详情面板 -->
    <div class="panel-card" style="margin-top: var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title">权限详情</span>
      </div>
      <div class="panel-card-body">
        <div v-if="!selectedPermDetail" style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">
          点击权限矩阵中的复选框查看权限详情
        </div>
        <div v-else>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-4)">
            <div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">权限项</div>
              <div style="font-weight: 600">{{ selectedPermDetail.perm }}</div>
            </div>
            <div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">角色</div>
              <div style="font-weight: 600">{{ selectedPermDetail.role }}</div>
            </div>
            <div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">模块</div>
              <div style="font-weight: 600">{{ selectedPermDetail.module }}</div>
            </div>
          </div>
          <div style="margin-top: var(--space-2)">
            状态:
            <span
              :style="{
                color: selectedPermDetail.checked ? 'var(--color-success)' : 'var(--color-danger)',
                fontWeight: 600
              }"
            >
              {{ selectedPermDetail.checked ? '允许' : '禁止' }}
            </span>
            <span v-if="selectedPermDetail.category" style="margin-left: var(--space-2)">
              · 分类:
              <span class="perm-category-badge" :class="selectedPermDetail.category">
                {{ categoryLabels[selectedPermDetail.category] || selectedPermDetail.category }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入弹窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">导入权限配置</span>
          <button class="modal-close" @click="showImportModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">粘贴JSON配置</label>
            <textarea v-model="importJson" class="form-input" rows="10" placeholder="粘贴导出的JSON配置..."></textarea>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-warning)">
            注意：导入将覆盖当前所有权限配置，请确保已备份。
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
          <button class="btn btn-primary" @click="doImport">导入</button>
        </div>
      </div>
    </div>

    <!-- 新增角色弹窗 -->
    <div v-if="showAddRoleModal" class="modal-overlay" @click.self="showAddRoleModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">新增角色</span>
          <button class="modal-close" @click="showAddRoleModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              角色名称
              <span style="color: var(--color-danger)">*</span>
            </label>
            <input v-model="newRoleName" type="text" class="form-input" placeholder="请输入角色名称" />
          </div>
          <div class="form-group">
            <label class="form-label">继承权限自</label>
            <select v-model="newRoleBase" class="form-select">
              <option value="">不继承（空白权限）</option>
              <option v-for="role in permStore.roles" :key="role" :value="role">{{ role }}</option>
            </select>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
            继承后可在权限矩阵中进一步调整该角色的权限。
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddRoleModal = false">取消</button>
          <button class="btn btn-primary" @click="doAddRole">创建角色</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'SalesPermission' }
</script>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePermissionStore } from '@/stores/permission'

const permStore = usePermissionStore()

const showHelp = ref(false)
const newRoleName = ref('')
const newRoleBase = ref('')
const showAddRoleModal = ref(false)
const showImportModal = ref(false)
const importJson = ref('')
const permSearch = ref('')
const permModuleFilter = ref('')
const selectedPermDetail = ref(null)
const showTemplateDropdown = ref(false)
const batchAction = ref('')

const expandedModules = ref(new Set())

const categoryLabels = {
  view: '查看',
  create: '创建',
  approve: '审批',
  delete: '删除',
  export: '导出',
  print: '打印',
  edit: '编辑',
  import: '导入',
  special: '特殊'
}

function toggleModuleExpand(key) {
  if (expandedModules.value.has(key)) {
    expandedModules.value.delete(key)
  } else {
    expandedModules.value.add(key)
  }
  expandedModules.value = new Set(expandedModules.value)
}

const moduleFilterMap = {
  quote_contract: ['quote_contract'],
  inbound: ['inbound'],
  outbound: ['outbound'],
  statement: ['statement'],
  delivery: ['delivery'],
  cost: ['cost']
}

const filteredModules = computed(() => {
  let modules = permStore.defaultModules
  if (permModuleFilter.value) {
    const keys = moduleFilterMap[permModuleFilter.value] || [permModuleFilter.value]
    modules = modules.filter((m) => keys.includes(m.key))
  }
  if (permSearch.value) {
    const q = permSearch.value.toLowerCase()
    modules = modules
      .map((m) => ({
        ...m,
        perms: m.perms.filter(
          (p) => (permStore.permLabels[p] || p).toLowerCase().includes(q) || m.label.toLowerCase().includes(q)
        )
      }))
      .filter((m) => m.perms.length > 0)
  }
  return modules
})

const permSummaryText = computed(() => {
  const total = permStore.totalPerms
  const changes = permStore.changeCount
  return `共 ${total} 项权限` + (changes > 0 ? `，${changes} 项未保存` : '')
})

function onPermChange(role, modKey, perm, checked) {
  permStore.setPerm(role, modKey, perm, checked)
  selectedPermDetail.value = {
    role,
    module: permStore.defaultModules.find((m) => m.key === modKey)?.label || modKey,
    perm: permStore.permLabels[perm] || perm,
    checked,
    category: getPermCategory(perm)
  }
}

function isModuleAllChecked(role, mod) {
  return mod.perms.every((p) => permStore.getPerm(role, mod.key, p))
}

function isModulePartial(role, mod) {
  const checked = mod.perms.filter((p) => permStore.getPerm(role, mod.key, p)).length
  return checked > 0 && checked < mod.perms.length
}

function toggleModuleAll(role, mod) {
  const allChecked = isModuleAllChecked(role, mod)
  mod.perms.forEach((p) => permStore.setPerm(role, mod.key, p, !allChecked))
}

function saveAll() {
  permStore.savePermissions()
  alert('权限配置已保存')
}

function resetAll() {
  if (confirm('确认重置所有权限配置？将恢复为标准模式默认配置。')) permStore.resetPermissions()
}

function applyTemplate(template) {
  if (confirm('应用模板将覆盖当前所有权限配置，确认继续？')) {
    permStore.applyTemplate(template)
  }
}

function openAddRoleModal() {
  newRoleName.value = ''
  newRoleBase.value = ''
  showAddRoleModal.value = true
}

function doAddRole() {
  if (!newRoleName.value.trim()) {
    alert('请输入角色名称')
    return
  }
  if (permStore.addRole(newRoleName.value.trim(), newRoleBase.value || null)) {
    showAddRoleModal.value = false
    newRoleName.value = ''
    newRoleBase.value = ''
  } else {
    alert('角色已存在')
  }
}

function removeRole(role) {
  if (confirm('确认删除角色 "' + role + '"？删除后该角色的所有权限配置将丢失。')) {
    permStore.removeRole(role)
  }
}

function doExport() {
  const data = permStore.exportPermissions()
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '权限配置_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function doImport() {
  if (!importJson.value.trim()) {
    alert('请粘贴JSON配置')
    return
  }
  if (confirm('导入将覆盖当前所有权限配置，确认继续？')) {
    if (permStore.importPermissions(importJson.value)) {
      showImportModal.value = false
      importJson.value = ''
      alert('导入成功')
    } else {
      alert('导入失败，请检查JSON格式（需包含roles和matrix字段）')
    }
  }
}

// 批量操作
function doBatchAction() {
  if (!batchAction.value) return
  const allRoles = [...permStore.roles]
  if (batchAction.value === 'enableView') {
    permStore.batchSetPermissions(allRoles, permStore.permCategories.view, true)
  } else if (batchAction.value === 'enableCreate') {
    permStore.batchSetPermissions(allRoles, permStore.permCategories.create, true)
  } else if (batchAction.value === 'disableDelete') {
    permStore.batchSetPermissions(allRoles, permStore.permCategories.delete, false)
  } else if (batchAction.value === 'disableExport') {
    permStore.batchSetPermissions(allRoles, permStore.permCategories.export, false)
  }
  batchAction.value = ''
}

// 权限分类
function getPermCategory(perm) {
  for (const [cat, perms] of Object.entries(permStore.permCategories)) {
    if (perms.includes(perm)) return cat
  }
  return 'other'
}

function getPermCategoryLabel(perm) {
  const cat = getPermCategory(perm)
  return categoryLabels[cat] || cat
}

// 角色权限百分比
function getRolePermPercent(role) {
  const stats = permStore.getRolePermStats(role)
  return stats ? stats.percentage : 0
}

// 模块权限百分比
function getModulePermPercent(moduleKey) {
  const stats = permStore.getModulePermStats(moduleKey)
  return stats ? stats.percentage : 0
}

onMounted(() => {
  permStore.defaultModules.forEach((m) => expandedModules.value.add(m.key))
})
</script>

<style scoped>
.role-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
}
.role-chip-remove {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 0 var(--space-1);
  font-size: 10px;
}
.role-chip-remove:hover {
  color: var(--color-danger);
}
.module-header-row {
  background: var(--color-surface-elevated);
}
.module-header-row td {
  font-weight: 600;
  border-bottom: 2px solid var(--color-border);
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.perm-matrix-table td {
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.perm-matrix-table th {
  overflow-wrap: break-word;
  word-wrap: break-word;
}
.perm-category-badge {
  display: inline-block;
  padding: 0 var(--space-1);
  border-radius: 2px;
  font-size: 9px;
  font-weight: 600;
  margin-left: var(--space-1);
  vertical-align: middle;
}
.perm-category-badge.view {
  background: var(--color-cyan-subtle);
  color: var(--color-info);
}
.perm-category-badge.create {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.perm-category-badge.approve {
  background: var(--color-purple-subtle);
  color: var(--color-purple);
}
.perm-category-badge.delete {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.perm-category-badge.export {
  background: var(--color-info-subtle);
  color: var(--color-accent);
}
.perm-category-badge.print {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}
.perm-category-badge.edit {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.perm-category-badge.import {
  background: var(--color-orange-subtle);
  color: var(--color-accent);
}
.perm-category-badge.special {
  background: var(--color-pink-subtle);
  color: var(--color-accent);
}
.perm-category-badge.other {
  background: var(--color-gray-subtle);
  color: var(--color-text-secondary);
}

/* ===== Keyframes ===== */
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== Stat Cards ===== */
.stat-card {
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.stat-card-value {
  font-family: var(--font-mono);
}

/* ===== Role Chips ===== */
.role-chip {
  transition: transform 0.2s ease;
}
.role-chip:hover {
  transform: translateY(-2px);
}

/* ===== Table Row Animation ===== */
.row-slide-in {
  animation: rowSlideIn 0.3s ease-out both;
}

/* ===== Empty State ===== */
.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
}
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}

/* 响应式适配 */
@media (max-width: 1024px) {
  .page-header-actions {
    flex-wrap: wrap;
  }
  .stats-row {
    flex-wrap: wrap;
  }
  .filter-bar {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .page-header-actions {
    flex-wrap: wrap;
  }
  .stats-row {
    flex-direction: column;
  }
  .filter-bar {
    flex-direction: column;
  }
  table {
    font-size: 12px;
  }
}
</style>
