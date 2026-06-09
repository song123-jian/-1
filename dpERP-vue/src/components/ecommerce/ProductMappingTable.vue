<template>
  <div class="product-mapping-table">
    <!-- 操作栏 -->
    <div class="mapping-toolbar">
      <button class="btn btn-sm btn-primary" @click="showAddModal = true">
        <Icon name="add" :size="12" /> 新增映射
      </button>
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>平台SKU</th>
            <th>平台商品名</th>
            <th>本地SKU</th>
            <th>本地商品名</th>
            <th>同步价格</th>
            <th>同步库存</th>
            <th>最后同步</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="mappings.length === 0">
            <td colspan="8" class="empty-state">暂无商品映射</td>
          </tr>
          <tr v-for="mapping in mappings" :key="mapping.id">
            <td class="cell-mono">{{ mapping.platformSku }}</td>
            <td>{{ mapping.platformName }}</td>
            <td class="cell-mono">{{ mapping.localSku }}</td>
            <td>{{ mapping.localName }}</td>
            <td>
              <span class="mapping-toggle" :class="{ active: mapping.syncPrice }">
                {{ mapping.syncPrice ? '是' : '否' }}
              </span>
            </td>
            <td>
              <span class="mapping-toggle" :class="{ active: mapping.syncStock }">
                {{ mapping.syncStock ? '是' : '否' }}
              </span>
            </td>
            <td>{{ formatTime(mapping.lastSyncTime) }}</td>
            <td>
              <button class="action-btn danger" @click="confirmDelete(mapping)">
                <Icon name="delete" :size="12" /> 删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增映射弹窗 -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">新增商品映射</h3>
            <button class="modal-close" @click="closeAddModal"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">平台SKU <span class="required">*</span></label>
              <input v-model="addForm.platformSku" type="text" class="form-input" placeholder="如 TB-SKU-001" />
              <span v-if="addErrors.platformSku" class="form-error">{{ addErrors.platformSku }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">平台商品名 <span class="required">*</span></label>
              <input v-model="addForm.platformName" type="text" class="form-input" placeholder="如 ABS树脂(淘宝版)" />
              <span v-if="addErrors.platformName" class="form-error">{{ addErrors.platformName }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">本地SKU <span class="required">*</span></label>
              <input v-model="addForm.localSku" type="text" class="form-input" placeholder="如 MTL-001" />
              <span v-if="addErrors.localSku" class="form-error">{{ addErrors.localSku }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">本地商品名 <span class="required">*</span></label>
              <input v-model="addForm.localName" type="text" class="form-input" placeholder="如 ABS树脂" />
              <span v-if="addErrors.localName" class="form-error">{{ addErrors.localName }}</span>
            </div>
            <div class="form-row" style="gap: var(--space-4);">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">同步价格</label>
                <div class="toggle-switch" :class="{ active: addForm.syncPrice }" @click="addForm.syncPrice = !addForm.syncPrice">
                  <span class="toggle-knob"></span>
                </div>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">同步库存</label>
                <div class="toggle-switch" :class="{ active: addForm.syncStock }" @click="addForm.syncStock = !addForm.syncStock">
                  <span class="toggle-knob"></span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeAddModal">取消</button>
            <button class="btn btn-primary" @click="handleAdd">确认添加</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-dialog" style="max-width: 400px;">
          <div class="modal-header">
            <h3 class="modal-title">确认删除</h3>
            <button class="modal-close" @click="showDeleteConfirm = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              确定要删除映射 <strong style="color: var(--color-text-primary);">{{ deleteTarget?.platformSku }}</strong>
              与 <strong style="color: var(--color-text-primary);">{{ deleteTarget?.localSku }}</strong> 的映射关系吗？此操作不可撤销。
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">取消</button>
            <button class="btn btn-danger" @click="handleDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
  mappings: { type: Array, default: () => [] }
})

const emit = defineEmits(['add', 'remove'])

const showAddModal = ref(false)
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)

const addForm = reactive({
  platformSku: '',
  platformName: '',
  localSku: '',
  localName: '',
  syncPrice: true,
  syncStock: true
})

const addErrors = reactive({
  platformSku: '',
  platformName: '',
  localSku: '',
  localName: ''
})

function closeAddModal() {
  showAddModal.value = false
  resetAddForm()
}

function resetAddForm() {
  addForm.platformSku = ''
  addForm.platformName = ''
  addForm.localSku = ''
  addForm.localName = ''
  addForm.syncPrice = true
  addForm.syncStock = true
  addErrors.platformSku = ''
  addErrors.platformName = ''
  addErrors.localSku = ''
  addErrors.localName = ''
}

function validateAddForm() {
  let valid = true
  addErrors.platformSku = ''
  addErrors.platformName = ''
  addErrors.localSku = ''
  addErrors.localName = ''

  if (!addForm.platformSku.trim()) {
    addErrors.platformSku = '请输入平台SKU'
    valid = false
  }
  if (!addForm.platformName.trim()) {
    addErrors.platformName = '请输入平台商品名'
    valid = false
  }
  if (!addForm.localSku.trim()) {
    addErrors.localSku = '请输入本地SKU'
    valid = false
  }
  if (!addForm.localName.trim()) {
    addErrors.localName = '请输入本地商品名'
    valid = false
  }

  /* 检查SKU是否已存在映射 */
  if (valid) {
    const exists = props.mappings.find(
      m => m.platformSku === addForm.platformSku && m.localSku === addForm.localSku
    )
    if (exists) {
      addErrors.platformSku = '该平台SKU与本地SKU的映射已存在'
      valid = false
    }
  }

  return valid
}

function handleAdd() {
  if (!validateAddForm()) return
  emit('add', { ...addForm })
  closeAddModal()
}

function confirmDelete(mapping) {
  deleteTarget.value = mapping
  showDeleteConfirm.value = true
}

function handleDelete() {
  if (deleteTarget.value) {
    emit('remove', deleteTarget.value.id)
  }
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

function formatTime(time) {
  if (!time) return '暂无'
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.product-mapping-table {
  width: 100%;
}

.mapping-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-3);
}

.mapping-toggle {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

.mapping-toggle.active {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.form-error {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: 2px;
}

.toggle-switch {
  width: 40px;
  height: 22px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  cursor: pointer;
  position: relative;
  transition: background var(--transition-fast);
  border: 1px solid var(--color-border);
}

.toggle-switch.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--transition-fast);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(18px);
}
</style>
