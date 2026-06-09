<template>
  <div>
    <div class="page-header" style="margin-bottom:var(--space-3)">
      <div>
        <h2 class="page-header-title">数据字典</h2>
        <p class="page-header-subtitle">管理系统枚举值、分类标准和业务配置项</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openDictEntryModal"><Icon name="add" :size="14" /> 新增字典项</button>
        <button class="btn btn-secondary" @click="exportDicts"><Icon name="download" :size="14" /> 导出字典</button>
      </div>
    </div>
    <div class="filter-bar" style="margin-bottom:var(--space-3);flex-wrap:wrap;gap:var(--space-2)">
      <select class="form-select" v-model="dictCategoryFilter">
        <option value="">全部分类</option>
        <option value="customer_level">客户等级</option><option value="biz_type">业务类型</option><option value="warehouse">仓库</option>
        <option value="payment_method">付款方式</option><option value="delivery_status">送货状态</option><option value="quotation_status">报价状态</option>
      </select>
      <input type="text" class="form-input" v-model="dictSearch" placeholder="搜索字典项..." style="min-width:160px">
    </div>
    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>分类</th><th>编码</th><th>名称</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-if="filteredDictEntries.length === 0"><td colspan="6" class="empty-state">暂无字典项</td></tr>
              <tr v-for="entry in filteredDictEntries" :key="entry.id">
                <td>{{ entry.category }}</td><td>{{ entry.code }}</td><td>{{ entry.name }}</td><td>{{ entry.sort }}</td>
                <td><span class="status-badge" :class="entry.enabled ? 'success' : 'neutral'">{{ entry.enabled ? '启用' : '禁用' }}</span></td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="editDictEntry(entry)">编辑</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteDictEntry(entry.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showDictModal" class="modal-overlay" @click.self="showDictModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingDict ? '编辑字典' : '新增字典' }}</span><button class="modal-close" @click="showDictModal = false"><Icon name="close" :size="14" /></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">字典名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="dictForm.name"></div>
          <div class="form-group"><label class="form-label">字典编码 <span class="required">*</span></label><input type="text" class="form-input" v-model="dictForm.code"></div>
          <div class="form-group"><label class="form-label">描述</label><input type="text" class="form-input" v-model="dictForm.description"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showDictModal = false">取消</button><button class="btn btn-primary" @click="submitDict">保存</button></div>
      </div>
    </div>

    <div v-if="showEntryModal" class="modal-overlay" @click.self="showEntryModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingDictEntry ? '编辑字典项' : '添加字典项' }}</span><button class="modal-close" @click="showEntryModal = false"><Icon name="close" :size="14" /></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">分类 <span class="required">*</span></label>
            <select class="form-select" v-model="entryForm.category" style="width:100%">
              <option value="">请选择分类</option>
              <option value="客户等级">客户等级</option><option value="业务类型">业务类型</option><option value="仓库">仓库</option>
              <option value="付款方式">付款方式</option><option value="送货状态">送货状态</option><option value="报价状态">报价状态</option>
            </select>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="entryForm.label"></div>
            <div class="form-group"><label class="form-label">编码 <span class="required">*</span></label><input type="text" class="form-input" v-model="entryForm.value"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">排序</label><input type="number" class="form-input" v-model.number="entryForm.sort" min="1"></div>
            <div class="form-group"><label class="form-label"><input type="checkbox" v-model="entryForm.enabled"> 启用</label></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showEntryModal = false">取消</button><button class="btn btn-primary" @click="submitEntry">{{ editingDictEntry ? '保存' : '添加' }}</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useSystemStore } from '@/stores/system'

const sysStore = useSystemStore()

const dictCategoryFilter = ref('')
const dictSearch = ref('')
const selectedDictId = ref('')

const showDictModal = ref(false)
const showEntryModal = ref(false)
const editingDict = ref(null)
const editingDictEntry = ref(null)

const dictForm = reactive({ name: '', code: '', description: '' })
const entryForm = reactive({ label: '', value: '', sort: 1, enabled: true, category: '' })

const selectedDict = computed(() => sysStore.dictionaries.find(d => d.id === selectedDictId.value) || null)

const filteredDictEntries = computed(() => {
  let entries = []
  sysStore.dictionaries.forEach(dict => {
    dict.entries.forEach(entry => {
      entries.push({ ...entry, category: dict.name, code: entry.value })
    })
  })
  if (dictCategoryFilter.value) {
    const filterMap = { customer_level: '客户等级', biz_type: '业务类型', warehouse: '仓库', payment_method: '付款方式', delivery_status: '送货状态', quotation_status: '报价状态' }
    const filterLabel = filterMap[dictCategoryFilter.value]
    if (filterLabel) entries = entries.filter(e => e.category === filterLabel)
  }
  if (dictSearch.value) {
    const q = dictSearch.value.toLowerCase()
    entries = entries.filter(e => (e.label || '').toLowerCase().includes(q) || (e.value || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q))
  }
  return entries
})

function exportDicts() {
  const data = JSON.stringify(sysStore.dictionaries, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '数据字典_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function openDictModal() {
  editingDict.value = null
  Object.assign(dictForm, { name: '', code: '', description: '' })
  showDictModal.value = true
}

function editDict(dict) {
  editingDict.value = dict
  Object.assign(dictForm, { name: dict.name, code: dict.code, description: dict.description })
  showDictModal.value = true
}

function submitDict() {
  if (!dictForm.name || !dictForm.code) { alert('请填写字典名称和编码'); return }
  if (editingDict.value) {
    sysStore.updateDictionary(editingDict.value.id, { ...dictForm })
  } else {
    sysStore.addDictionary({ ...dictForm })
  }
  showDictModal.value = false
}

function deleteDict(id) { if (confirm('确认删除该字典？')) sysStore.deleteDictionary(id) }

function openEntryModal() { Object.assign(entryForm, { label: '', value: '', sort: 1, enabled: true }); showEntryModal.value = true }

function submitEntry() {
  if (!entryForm.label || !entryForm.value) { alert('请填写名称和编码'); return }
  if (editingDictEntry.value) {
    editingDictEntry.value.label = entryForm.label
    editingDictEntry.value.value = entryForm.value
    editingDictEntry.value.sort = entryForm.sort
    editingDictEntry.value.enabled = entryForm.enabled
  } else {
    sysStore.addDictEntry(selectedDictId.value, { ...entryForm })
  }
  showEntryModal.value = false
}

function removeEntry(entryId) { sysStore.removeDictEntry(selectedDictId.value, entryId) }

function openDictEntryModal() {
  editingDictEntry.value = null
  Object.assign(entryForm, { label: '', value: '', sort: 1, enabled: true, category: '' })
  showEntryModal.value = true
}

function editDictEntry(entry) {
  editingDictEntry.value = entry
  Object.assign(entryForm, { label: entry.label, value: entry.value, sort: entry.sort, enabled: entry.enabled })
  showEntryModal.value = true
}

function deleteDictEntry(entryId) {
  if (confirm('确认删除该字典项？')) {
    sysStore.dictionaries.forEach(dict => {
      const idx = dict.entries.findIndex(e => e.id === entryId)
      if (idx !== -1) dict.entries.splice(idx, 1)
    })
  }
}
</script>

<style scoped>
.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.status-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 600; }
.status-badge.success { background: var(--color-success-subtle, #dcfce7); color: var(--color-success, #16a34a); }
.status-badge.neutral { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.form-input, .form-select { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text-primary); }
.form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-3); }
.form-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
.required { color: var(--color-danger); }
.form-row { display: grid; gap: var(--space-3); }
.form-row-2 { grid-template-columns: 1fr 1fr; }
.filter-bar { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
.modal-title { font-size: var(--font-size-lg); font-weight: 600; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: 12px 20px; border-top: 1px solid var(--color-border); }
</style>
