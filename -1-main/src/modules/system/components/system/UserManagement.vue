<template>
  <div>
    <div class="page-header" style="margin-bottom: var(--space-3)">
      <div>
        <h2 class="page-header-title">用户管理</h2>
        <p class="page-header-subtitle">管理系统用户、角色分配与权限配置</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openUserModal">
          <Icon name="add" :size="14" />
          新增用户
        </button>
      </div>
    </div>
    <div class="filter-bar" style="margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2)">
      <input
        v-model="userSearch"
        type="text"
        class="form-input"
        placeholder="搜索用户名/姓名..."
        style="min-width: 160px"
      />
      <select v-model="userRoleFilter" class="form-select">
        <option value="">全部角色</option>
        <option value="admin">管理员</option>
        <option value="gm">总经理</option>
        <option value="sales_manager">销售主管</option>
        <option value="sales">销售员</option>
        <option value="warehouse_manager">仓库主管</option>
        <option value="warehouse_staff">仓管员</option>
        <option value="finance">财务</option>
        <option value="viewer">查看者</option>
      </select>
      <select v-model="userStatusFilter" class="form-select">
        <option value="">全部状态</option>
        <option value="active">启用</option>
        <option value="disabled">禁用</option>
      </select>
    </div>
    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>姓名</th>
                <th>角色</th>
                <th>状态</th>
                <th>最后登录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredUsers.length === 0"><td colspan="6" class="empty-state">暂无用户</td></tr>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>{{ user.username }}</td>
                <td>{{ user.realName }}</td>
                <td>
                  <span class="role-badge">{{ user.role }}</span>
                </td>
                <td>
                  <span class="status-badge" :class="user.status === 'active' ? 'success' : 'neutral'">
                    {{ user.status === 'active' ? '启用' : '禁用' }}
                  </span>
                </td>
                <td>{{ user.lastLogin || '-' }}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="editUser(user)">编辑</button>
                  <button class="btn btn-ghost btn-sm" @click="toggleUserStatus(user)">
                    {{ user.status === 'active' ? '禁用' : '启用' }}
                  </button>
                  <button class="btn btn-ghost btn-sm" style="color: var(--color-danger)" @click="deleteUser(user.id)">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="panel-card" style="margin-top: var(--space-4)">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="shield" :size="14" />
          角色权限矩阵
        </span>
      </div>
      <div class="panel-card-body" style="overflow-x: auto">
        <table class="data-table" style="font-size: var(--font-size-xs)">
          <thead>
            <tr>
              <th style="position: sticky; left: 0; background: var(--color-surface-elevated); z-index: var(--z-base)">权限项</th>
              <th v-for="role in roleList" :key="role.key">{{ role.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perm in permissionList" :key="perm.key">
              <td
                style="
                  position: sticky;
                  left: 0;
                  background: var(--color-surface-elevated);
                  z-index: var(--z-base);
                  font-weight: 600;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                "
              >
                {{ perm.label }}
              </td>
              <td v-for="role in roleList" :key="role.key" style="text-align: center">
                <span v-if="rolePermissions[role.key]?.includes(perm.key)" style="color: var(--color-success)">
                  <Icon name="checkCircle" :size="14" />
                </span>
                <span v-else style="color: var(--color-text-tertiary)"><Icon name="close" :size="14" /></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">{{ editingUser ? '编辑用户' : '新增用户' }}</span>
          <button class="modal-close" @click="showUserModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                用户名
                <span class="required">*</span>
              </label>
              <input v-model="userForm.username" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">
                姓名
                <span class="required">*</span>
              </label>
              <input v-model="userForm.realName" type="text" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">角色</label>
            <select v-model="userForm.role" class="form-select">
              <option>管理员</option>
              <option>总经理</option>
              <option>销售主管</option>
              <option>销售员</option>
              <option>仓库主管</option>
              <option>仓管员</option>
              <option>财务</option>
              <option>查看者</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showUserModal = false">取消</button>
          <button class="btn btn-primary" @click="submitUser">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'UserManagement' }
</script>
<script setup>
import { ref, computed, reactive } from 'vue'
import { useSystemStore } from '@/modules/system/stores/system'

const sysStore = useSystemStore()

const userSearch = ref('')
const userRoleFilter = ref('')
const userStatusFilter = ref('')

const roleList = [
  { key: 'admin', label: '管理员' },
  { key: 'gm', label: '总经理' },
  { key: 'sales_manager', label: '销售主管' },
  { key: 'sales', label: '销售员' },
  { key: 'warehouse_manager', label: '仓库主管' },
  { key: 'warehouse_staff', label: '仓管员' },
  { key: 'finance', label: '财务' },
  { key: 'viewer', label: '查看者' }
]

const permissionList = [
  { key: 'create_quotation', label: '创建报价' },
  { key: 'approve_quotation', label: '审批报价' },
  { key: 'delete_quotation', label: '删除报价' },
  { key: 'create_contract', label: '创建合同' },
  { key: 'sign_contract', label: '签订合同' },
  { key: 'create_inbound', label: '创建入库' },
  { key: 'confirm_inbound', label: '确认入库' },
  { key: 'create_outbound', label: '创建出库' },
  { key: 'approve_outbound', label: '审批出库' },
  { key: 'create_reconciliation', label: '创建对账' },
  { key: 'confirm_reconciliation', label: '确认对账' },
  { key: 'create_delivery', label: '创建送货' },
  { key: 'view_cost', label: '查看成本' },
  { key: 'edit_cost', label: '编辑成本' }
]

const rolePermissions = {
  admin: permissionList.map((p) => p.key),
  gm: [
    'create_quotation',
    'approve_quotation',
    'delete_quotation',
    'create_contract',
    'sign_contract',
    'create_inbound',
    'confirm_inbound',
    'create_outbound',
    'approve_outbound',
    'create_reconciliation',
    'confirm_reconciliation',
    'create_delivery',
    'view_cost',
    'edit_cost'
  ],
  sales_manager: ['create_quotation', 'approve_quotation', 'create_contract', 'create_delivery', 'view_cost'],
  sales: ['create_quotation', 'create_contract', 'create_delivery'],
  warehouse_manager: ['create_inbound', 'confirm_inbound', 'create_outbound', 'approve_outbound', 'create_delivery'],
  warehouse_staff: ['create_inbound', 'create_outbound', 'create_delivery'],
  finance: ['create_reconciliation', 'confirm_reconciliation', 'view_cost', 'edit_cost'],
  viewer: ['view_cost']
}

const filteredUsers = computed(() => {
  let users = sysStore.users || []
  if (userRoleFilter.value) users = users.filter((u) => u.role === userRoleFilter.value)
  if (userStatusFilter.value) users = users.filter((u) => u.status === userStatusFilter.value)
  if (userSearch.value) {
    const q = userSearch.value.toLowerCase()
    users = users.filter(
      (u) => (u.username || '').toLowerCase().includes(q) || (u.realName || '').toLowerCase().includes(q)
    )
  }
  return users
})

const showUserModal = ref(false)
const editingUser = ref(null)
const userForm = reactive({ username: '', realName: '', role: '查看者' })

function openUserModal() {
  editingUser.value = null
  Object.assign(userForm, { username: '', realName: '', role: '查看者' })
  showUserModal.value = true
}

function editUser(user) {
  editingUser.value = user
  Object.assign(userForm, { username: user.username, realName: user.realName, role: user.role })
  showUserModal.value = true
}

function submitUser() {
  if (!userForm.username || !userForm.realName) {
    alert('请填写用户名和姓名')
    return
  }
  if (editingUser.value) {
    sysStore.updateUser(editingUser.value.id, { ...userForm })
  } else {
    sysStore.addUser({ ...userForm })
  }
  showUserModal.value = false
}

function toggleUserStatus(user) {
  sysStore.updateUser(user.id, { status: user.status === 'active' ? 'inactive' : 'active' })
}
function deleteUser(id) {
  if (confirm('确认删除该用户？')) sysStore.deleteUser(id)
}
</script>

<style scoped>
.btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.btn:hover {
  background: var(--color-bg-secondary);
}
.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.btn-ghost {
  border-color: transparent;
  background: transparent;
}
.btn-ghost:hover {
  background: var(--color-bg-secondary);
}
.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
}
.status-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.status-badge.success {
  background: var(--color-success-subtle, #dcfce7);
  color: var(--color-success, #16a34a);
}
.status-badge.neutral {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}
.role-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  background: var(--color-info-subtle);
  color: var(--color-info);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
}
.form-input,
.form-select {
  padding: var(--space-2) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}
.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.required {
  color: var(--color-danger);
}
.form-row {
  display: grid;
  gap: var(--space-3);
}
.form-row-2 {
  grid-template-columns: 1fr 1fr;
}
.filter-bar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}
.modal-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}
.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-text-secondary);
}
.modal-close:hover {
  background: var(--color-bg-tertiary);
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
}
</style>
