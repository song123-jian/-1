<template>
  <div class="permission-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">销售权限配置</h2>
        <p class="page-header-subtitle">配置客户数据的访问权限、编辑权限和操作权限</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="saveAll">💾 保存配置</button>
        <button class="btn btn-ghost" @click="resetAll">🔄 重置</button>
        <button class="btn btn-ghost" @click="addRole">＋ 新增角色</button>
        <button class="btn btn-ghost" @click="doExport">📥 导出</button>
        <button class="btn btn-ghost" @click="showImportModal = true">📤 导入</button>
      </div>
    </div>

    <div class="stats-row" style="margin-bottom:var(--space-4)">
      <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">👥</div><div class="stat-card-value">{{ permStore.roleCount }}</div><div class="stat-card-label">角色数</div></div>
      <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">🔑</div><div class="stat-card-value">{{ permStore.totalPerms }}</div><div class="stat-card-label">权限项总数</div></div>
      <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)">✏️</div><div class="stat-card-value">{{ permStore.changeCount }}</div><div class="stat-card-label">未保存变更</div></div>
      <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)">🕐</div><div class="stat-card-value" style="font-size:var(--font-size-sm)">{{ permStore.lastSaved || '未保存' }}</div><div class="stat-card-label">上次保存</div></div>
    </div>

    <div class="filter-bar" style="margin-bottom:var(--space-4)">
      <input type="text" class="form-input" v-model="permSearch" placeholder="搜索权限项...">
      <select class="form-select" v-model="permModuleFilter">
        <option value="">全部模块</option>
        <option value="quote_contract">报价/合同</option>
        <option value="inbound">入库</option>
        <option value="outbound">出库</option>
        <option value="statement">对账</option>
        <option value="delivery">送货</option>
        <option value="cost">成本核算</option>
      </select>
    </div>

    <div class="panel-card" style="margin-bottom:var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title">快速模板</span>
      </div>
      <div class="panel-card-body" style="display:flex;gap:var(--space-3);flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" @click="applyTemplate('strict')">🔒 严格模式 — 仅管理员和总经理有完整权限</button>
        <button class="btn btn-ghost btn-sm" @click="applyTemplate('standard')">📋 标准模式 — 按角色分级授权</button>
        <button class="btn btn-ghost btn-sm" @click="applyTemplate('loose')">🔓 宽松模式 — 全部角色开放</button>
      </div>
    </div>

    <div class="panel-card" style="margin-bottom:var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title">角色管理</span>
      </div>
      <div class="panel-card-body" style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center">
        <span v-for="role in permStore.roles" :key="role" class="role-chip">
          {{ role }}
          <button v-if="!['管理员', '总经理'].includes(role)" class="role-chip-remove" @click="removeRole(role)">✕</button>
        </span>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <input type="text" class="form-input" v-model="newRoleName" placeholder="新角色名称" style="width:120px" @keyup.enter="addRole">
          <button class="btn btn-ghost btn-sm" @click="addRole">➕ 添加</button>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">权限矩阵</span>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-left:auto">{{ permSummaryText }}</span>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container" style="overflow-x:auto">
          <table class="data-table perm-matrix-table">
            <thead>
              <tr>
                <th style="min-width:120px;position:sticky;left:0;background:var(--color-surface-elevated);z-index:1">模块 / 权限</th>
                <th v-for="role in permStore.roles" :key="role" style="min-width:100px;text-align:center">{{ role }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="mod in filteredModules" :key="mod.key">
                <tr class="module-header-row">
                  <td style="font-weight:600;position:sticky;left:0;background:var(--color-surface-elevated);z-index:1">{{ mod.label }}</td>
                  <td v-for="role in permStore.roles" :key="role" style="text-align:center">
                    <label style="cursor:pointer" @click.prevent="toggleModuleAll(role, mod)">
                      <input type="checkbox" :checked="isModuleAllChecked(role, mod)" :indeterminate.prop="isModulePartial(role, mod)">
                    </label>
                  </td>
                </tr>
                <tr v-for="perm in mod.perms" :key="mod.key + '.' + perm">
                  <td style="padding-left:var(--space-6);position:sticky;left:0;background:var(--color-surface);z-index:1">{{ permStore.permLabels[perm] || perm }}</td>
                  <td v-for="role in permStore.roles" :key="role" style="text-align:center">
                    <label style="cursor:pointer">
                      <input type="checkbox" :checked="permStore.getPerm(role, mod.key, perm)" @change="onPermChange(role, mod.key, perm, $event.target.checked)">
                    </label>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title">权限详情</span>
      </div>
      <div class="panel-card-body">
        <div v-if="!selectedPermDetail" style="color:var(--color-text-secondary);font-size:var(--font-size-sm)">点击权限矩阵中的复选框查看权限详情</div>
        <div v-else>
          <div style="font-weight:600;margin-bottom:var(--space-2)">{{ selectedPermDetail.role }} — {{ selectedPermDetail.module }} — {{ selectedPermDetail.perm }}</div>
          <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">
            <div>状态: <span :style="{ color: selectedPermDetail.checked ? 'var(--color-success)' : 'var(--color-danger)' }">{{ selectedPermDetail.checked ? '已授权' : '未授权' }}</span></div>
            <div>模块: {{ selectedPermDetail.module }}</div>
            <div>权限项: {{ selectedPermDetail.perm }}</div>
            <div>角色: {{ selectedPermDetail.role }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">导入权限配置</span><button class="modal-close" @click="showImportModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">粘贴JSON配置</label><textarea class="form-input" v-model="importJson" rows="10" placeholder="粘贴导出的JSON配置..."></textarea></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showImportModal = false">取消</button><button class="btn btn-primary" @click="doImport">导入</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePermissionStore } from '@/stores/permission'

const permStore = usePermissionStore()

const newRoleName = ref('')
const showImportModal = ref(false)
const importJson = ref('')
const permSearch = ref('')
const permModuleFilter = ref('')
const selectedPermDetail = ref(null)

const moduleFilterMap = {
  quote_contract: ['quotation', 'contract'],
  inbound: ['inventory'],
  outbound: ['delivery'],
  statement: ['statement'],
  delivery: ['delivery'],
  cost: ['cost']
}

const filteredModules = computed(() => {
  let modules = permStore.defaultModules
  if (permModuleFilter.value) {
    const keys = moduleFilterMap[permModuleFilter.value] || [permModuleFilter.value]
    modules = modules.filter(m => keys.includes(m.key))
  }
  if (permSearch.value) {
    const q = permSearch.value.toLowerCase()
    modules = modules.map(m => ({
      ...m,
      perms: m.perms.filter(p => (permStore.permLabels[p] || p).toLowerCase().includes(q) || m.label.toLowerCase().includes(q))
    })).filter(m => m.perms.length > 0)
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
    module: permStore.defaultModules.find(m => m.key === modKey)?.label || modKey,
    perm: permStore.permLabels[perm] || perm,
    checked
  }
}

function isModuleAllChecked(role, mod) {
  return mod.perms.every(p => permStore.getPerm(role, mod.key, p))
}

function isModulePartial(role, mod) {
  const checked = mod.perms.filter(p => permStore.getPerm(role, mod.key, p)).length
  return checked > 0 && checked < mod.perms.length
}

function toggleModuleAll(role, mod) {
  const allChecked = isModuleAllChecked(role, mod)
  mod.perms.forEach(p => permStore.setPerm(role, mod.key, p, !allChecked))
}

function saveAll() {
  permStore.savePermissions()
  alert('权限配置已保存')
}

function resetAll() {
  if (confirm('确认重置所有权限配置？')) permStore.resetPermissions()
}

function applyTemplate(template) {
  permStore.applyTemplate(template)
}

function addRole() {
  if (!newRoleName.value.trim()) { alert('请输入角色名称'); return }
  if (permStore.addRole(newRoleName.value.trim())) {
    newRoleName.value = ''
  } else {
    alert('角色已存在')
  }
}

function removeRole(role) {
  if (confirm('确认删除角色 "' + role + '"？')) permStore.removeRole(role)
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
  if (!importJson.value.trim()) { alert('请粘贴JSON配置'); return }
  if (permStore.importPermissions(importJson.value)) {
    showImportModal.value = false
    importJson.value = ''
    alert('导入成功')
  } else {
    alert('导入失败，请检查JSON格式')
  }
}

onMounted(() => { permStore.initSeedData() })
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
  padding: 0 2px;
  font-size: 10px;
}
.role-chip-remove:hover { color: var(--color-danger); }
.module-header-row {
  background: var(--color-surface-elevated);
}
.module-header-row td {
  font-weight: 600;
  border-bottom: 2px solid var(--color-border);
}
.perm-matrix-table td,
.perm-matrix-table th {
  white-space: nowrap;
}
</style>
