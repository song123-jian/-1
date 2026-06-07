<template>
  <div class="tagcategory-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">标签分类</h2>
        <p class="page-header-subtitle">客户标签分类管理，支持分组、颜色、新增、编辑、删除</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openAddModal">[+] 新增标签</button>
        <button class="btn btn-ghost" @click="openAddGroupModal"><Icon name="folder" :size="14" /> 新增分组</button>
      </div>
    </div>

    <div class="stats-row" style="margin-bottom:var(--space-4)">
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)"><Icon name="tag" :size="14" /></div>
        <div class="stat-card-value">{{ customerStore.tags.length }}</div>
        <div class="stat-card-label">标签总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)"><Icon name="folder" :size="14" /></div>
        <div class="stat-card-value">{{ tagGroups.length }}</div>
        <div class="stat-card-label">分组数量</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-warning-subtle);color:var(--color-warning)"><Icon name="building" :size="14" /></div>
        <div class="stat-card-value">{{ taggedCustomerCount }}</div>
        <div class="stat-card-label">已标签客户</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:var(--color-purple-subtle);color:var(--color-purple)"><Icon name="table" :size="14" /></div>
        <div class="stat-card-value">{{ untaggedCustomerCount }}</div>
        <div class="stat-card-label">未标签客户</div>
      </div>
    </div>

    <div class="tag-toolbar">
      <div class="tag-search">
        <span class="search-icon"><Icon name="search" :size="14" /></span>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索标签名称..." />
      </div>
      <div class="tag-filters">
        <select v-model="filterGroup" class="form-select filter-select">
          <option value="all">全部分组</option>
          <option v-for="g in tagGroups" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
    </div>

    <div v-for="group in displayGroups" :key="group.name" class="tag-group-section">
      <div class="tag-group-header">
        <span class="tag-group-name">{{ group.name }}</span>
        <span class="tag-group-count">{{ group.tags.length }} 个标签</span>
        <button class="btn btn-ghost btn-sm" @click="confirmDeleteGroup(group.name)" title="删除分组"><Icon name="delete" :size="14" /></button>
      </div>
      <div class="tag-group-body">
        <div v-if="group.tags.length === 0" class="empty-hint">该分组暂无标签</div>
        <div v-for="tag in group.tags" :key="tag.id" class="tag-item" :style="{ borderLeftColor: tag.color }">
          <div class="tag-item-left">
            <span class="tag-item-preview" :style="{ background: tag.color + '20', color: tag.color }">{{ tag.name }}</span>
            <span class="tag-item-id">ID: {{ tag.id }}</span>
          </div>
          <div class="tag-item-right">
            <span class="tag-item-cust-count">{{ getTagCustomerCount(tag.id) }} 位客户</span>
            <button class="btn btn-ghost btn-sm" @click="openEditModal(tag)"><Icon name="edit" :size="14" /> 编辑</button>
            <button class="btn btn-ghost btn-sm danger" @click="confirmDeleteTag(tag)"><Icon name="delete" :size="14" /> 删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredTags.length === 0" class="panel-card" style="margin-top:var(--space-4)">
      <div class="panel-card-body" style="text-align:center;padding:var(--space-8)">
        <div style="font-size:48px;margin-bottom:var(--space-4)"><Icon name="tag" :size="14" /></div>
        <div style="color:var(--color-text-secondary)">暂无标签数据，点击"新增标签"开始创建</div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showTagModal" class="modal-overlay" @click.self="showTagModal = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ editingTag ? '编辑标签' : '新增标签' }}</h3>
            <button class="modal-close" @click="showTagModal = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">标签ID <span class="required">*</span></label>
              <input v-model="tagForm.id" type="text" class="form-input" placeholder="如：VIP、长期合作" :disabled="!!editingTag" />
              <div v-if="!editingTag" style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)">标签ID创建后不可修改</div>
            </div>
            <div class="form-group">
              <label class="form-label">标签名称 <span class="required">*</span></label>
              <input v-model="tagForm.name" type="text" class="form-input" placeholder="显示名称" />
            </div>
            <div class="form-group">
              <label class="form-label">标签颜色 <span class="required">*</span></label>
              <div class="color-picker-row">
                <span v-for="c in presetColors" :key="c" class="color-dot" :class="{ active: tagForm.color === c }" :style="{ background: c }" @click="tagForm.color = c"></span>
                <input v-model="tagForm.color" type="text" class="form-input" style="width:100px;margin-left:var(--space-2)" placeholder="#000000" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">所属分组</label>
              <select v-model="tagForm.group" class="form-select">
                <option v-for="g in tagGroups" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
            <div v-if="tagForm.name || tagForm.id" class="tag-preview-area">
              <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-2);display:block">预览效果</span>
              <span class="tag-item-preview" :style="{ background: tagForm.color + '20', color: tagForm.color }">{{ tagForm.name || tagForm.id }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showTagModal = false">取消</button>
            <button class="btn btn-primary" @click="saveTag">{{ editingTag ? '保存修改' : '创建标签' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showGroupModal" class="modal-overlay" @click.self="showGroupModal = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-header">
            <h3>新增分组</h3>
            <button class="modal-close" @click="showGroupModal = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">分组名称 <span class="required">*</span></label>
              <input v-model="newGroupName" type="text" class="form-input" placeholder="如：行业、地区" @keyup.enter="saveGroup" />
            </div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-2)">现有分组：{{ tagGroups.join('、') || '无' }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showGroupModal = false">取消</button>
            <button class="btn btn-primary" @click="saveGroup">创建</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-dialog modal-sm">
          <div class="modal-body" style="text-align:center;padding:32px 20px">
            <div style="font-size:48px;margin-bottom:12px"><Icon name="warning" :size="14" /></div>
            <div style="font-size:15px;color:var(--color-text-secondary)">{{ confirmMessage }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmAction">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useCustomerStore } from '@/stores/customer'

const customerStore = useCustomerStore()

const searchText = ref('')
const filterGroup = ref('all')
const showTagModal = ref(false)
const showGroupModal = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const confirmCallback = ref(null)
const editingTag = ref(null)
const newGroupName = ref('')

const presetColors = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#94a3b8'
]

const tagForm = reactive({
  id: '',
  name: '',
  color: '#3b82f6',
  group: '关系'
})

const tagGroups = computed(() => {
  const groups = new Set()
  customerStore.tags.forEach(t => { if (t.group) groups.add(t.group) })
  return [...groups].sort()
})

const filteredTags = computed(() => {
  let list = [...customerStore.tags]
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
  }
  if (filterGroup.value !== 'all') {
    list = list.filter(t => t.group === filterGroup.value)
  }
  return list
})

const displayGroups = computed(() => {
  const groups = filterGroup.value === 'all' ? tagGroups.value : [filterGroup.value]
  return groups.map(name => ({
    name,
    tags: filteredTags.value.filter(t => t.group === name)
  })).filter(g => g.tags.length > 0 || filterGroup.value === name)
})

const taggedCustomerCount = computed(() => {
  return customerStore.customers.filter(c => c.tags && c.tags.length > 0).length
})

const untaggedCustomerCount = computed(() => {
  return customerStore.customers.filter(c => !c.tags || c.tags.length === 0).length
})

function getTagCustomerCount(tagId) {
  return customerStore.customers.filter(c => c.tags && c.tags.includes(tagId)).length
}

function openAddModal() {
  editingTag.value = null
  Object.assign(tagForm, { id: '', name: '', color: '#3b82f6', group: tagGroups.value[0] || '关系' })
  showTagModal.value = true
}

function openEditModal(tag) {
  editingTag.value = tag
  Object.assign(tagForm, { id: tag.id, name: tag.name, color: tag.color, group: tag.group || tagGroups.value[0] || '关系' })
  showTagModal.value = true
}

function saveTag() {
  if (!tagForm.id.trim() || !tagForm.name.trim()) return
  if (!tagForm.color.match(/^#[0-9A-Fa-f]{6}$/)) return

  if (editingTag.value) {
    customerStore.updateTag(editingTag.value.id, {
      name: tagForm.name.trim(),
      color: tagForm.color,
      group: tagForm.group
    })
  } else {
    if (customerStore.tags.some(t => t.id === tagForm.id.trim())) return
    customerStore.addTag({
      id: tagForm.id.trim(),
      name: tagForm.name.trim(),
      color: tagForm.color,
      group: tagForm.group
    })
  }
  showTagModal.value = false
}

function confirmDeleteTag(tag) {
  const count = getTagCustomerCount(tag.id)
  confirmMessage.value = `确定要删除标签"${tag.name}"吗？${count > 0 ? `该标签关联了 ${count} 位客户，删除后将自动解除关联。` : ''}`
  confirmCallback.value = () => {
    customerStore.deleteTag(tag.id)
  }
  showConfirm.value = true
}

function openAddGroupModal() {
  newGroupName.value = ''
  showGroupModal.value = true
}

function saveGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  if (tagGroups.value.includes(name)) return
  customerStore.addTag({
    id: '_placeholder_' + Date.now(),
    name: name + '（示例标签）',
    color: '#94a3b8',
    group: name
  })
  showGroupModal.value = false
}

function confirmDeleteGroup(groupName) {
  const groupTags = customerStore.tags.filter(t => t.group === groupName)
  if (groupTags.length === 0) return
  confirmMessage.value = `删除分组"${groupName}"将同时删除该分组下的 ${groupTags.length} 个标签，确定继续？`
  confirmCallback.value = () => {
    groupTags.forEach(t => customerStore.deleteTag(t.id))
  }
  showConfirm.value = true
}

function confirmAction() {
  if (confirmCallback.value) confirmCallback.value()
  showConfirm.value = false
}
</script>

<style scoped>
.tagcategory-page { }

.page-header { margin-bottom: var(--space-6); }
.page-header-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); margin-bottom: var(--space-1); }
.page-header-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }

.stats-row { display: flex; gap: var(--space-4); flex-wrap: wrap; }
.stats-row .stat-card { flex: 1; min-width: 160px; display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5); }
.stats-row .stat-card-icon { width: 36px; height: 36px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); flex-shrink: 0; }
.stats-row .stat-card-value { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text-primary); font-family: var(--font-mono); }
.stats-row .stat-card-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.tag-toolbar { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
.tag-search { display: flex; align-items: center; gap: var(--space-2); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); flex: 1; min-width: 200px; }
.search-icon { font-size: 14px; color: var(--color-text-tertiary); }
.search-input { background: transparent; border: none; outline: none; color: var(--color-text-primary); font-size: var(--font-size-sm); width: 100%; }
.search-input::placeholder { color: var(--color-text-tertiary); }
.tag-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.filter-select { width: auto; min-width: 120px; }

.tag-group-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-4); overflow: hidden; }
.tag-group-header { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-5); border-bottom: 1px solid var(--color-border); background: var(--color-surface-elevated); }
.tag-group-name { font-weight: 600; font-size: var(--font-size-sm); color: var(--color-text-primary); }
.tag-group-count { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.tag-group-body { padding: var(--space-3) var(--space-5); }

.tag-item { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border-left: 3px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--space-2); background: var(--color-bg-primary); transition: all var(--transition-fast); }
.tag-item:hover { background: var(--color-surface-hover); }
.tag-item:last-child { margin-bottom: 0; }

.tag-item-left { display: flex; align-items: center; gap: var(--space-3); }
.tag-item-preview { display: inline-block; padding: 3px 12px; border-radius: 14px; font-size: var(--font-size-sm); font-weight: 500; }
.tag-item-id { font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }

.tag-item-right { display: flex; align-items: center; gap: var(--space-2); }
.tag-item-cust-count { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-right: var(--space-2); }

.color-picker-row { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.color-dot { width: 24px; height: 24px; border-radius: var(--radius-full); cursor: pointer; border: 2px solid transparent; transition: all var(--transition-fast); }
.color-dot:hover { transform: scale(1.15); }
.color-dot.active { border-color: var(--color-text-primary); box-shadow: 0 0 0 2px var(--color-accent-subtle); }

.tag-preview-area { margin-top: var(--space-4); padding: var(--space-3); background: var(--color-bg-primary); border-radius: var(--radius-md); }

.empty-hint { text-align: center; padding: var(--space-4); color: var(--color-text-tertiary); font-size: var(--font-size-sm); }

.btn.danger { color: var(--color-danger); }
.btn.danger:hover { background: var(--color-danger-subtle); }

.required { color: var(--color-danger); }

.form-group { margin-bottom: var(--space-4); }
.form-label { display: block; font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-secondary); margin-bottom: var(--space-1); }

.modal-overlay { backdrop-filter: blur(4px); }
.modal-dialog { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); width: 90%; max-width: 520px; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.modal-dialog.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); }
.modal-header h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text-primary); }
.modal-close { background: none; border: none; color: var(--color-text-tertiary); font-size: 18px; padding: var(--space-1); border-radius: var(--radius-md); transition: all var(--transition-fast); }
.modal-close:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.modal-body { padding: var(--space-5); }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border); }

.btn-danger { background: var(--color-danger); color: #fff; border-color: var(--color-danger); }
.btn-danger:hover { background: #dc2626; border-color: #dc2626; }

/* 响应式适配 */
@media (max-width: 1024px) {
  .stats-row {
    flex-wrap: wrap;
  }
  .stats-row .stat-card {
    min-width: 140px;
  }
  .page-header-actions {
    flex-wrap: wrap;
  }
  .tag-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .tag-search {
    min-width: unset;
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
  .stats-row .stat-card {
    min-width: unset;
  }
  .tag-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  .tag-item-right {
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .tag-group-header {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .color-picker-row {
    justify-content: flex-start;
  }
}
</style>
