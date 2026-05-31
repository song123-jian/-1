<template>
  <div class="company-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">公司信息</h2>
        <p class="page-header-subtitle">管理企业基本信息、安全与合规配置</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="saveCompany">💾 保存信息</button>
        <button class="btn btn-ghost" @click="exportCompany">📥 导出</button>
      </div>
    </div>

    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button>
    </div>

    <div v-if="activeTab === 'basic'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">基本信息</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">公司全称 <span class="required">*</span></label><input type="text" class="form-input" v-model="form.name"></div>
            <div class="form-group"><label class="form-label">简称</label><input type="text" class="form-input" v-model="form.shortName"></div>
            <div class="form-group"><label class="form-label">公司编码</label><input type="text" class="form-input" v-model="form.code"></div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">法定代表人</label><input type="text" class="form-input" v-model="form.legalPerson"></div>
            <div class="form-group"><label class="form-label">注册资本</label><input type="text" class="form-input" v-model="form.regCapital"></div>
            <div class="form-group"><label class="form-label">成立日期</label><input type="date" class="form-input" v-model="form.established"></div>
          </div>
          <div class="form-group"><label class="form-label">经营范围</label><textarea class="form-input" v-model="form.businessScope" rows="3"></textarea></div>
        </div>
      </div>

      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">联系方式</span></div>
        <div class="panel-card-body">
          <div class="form-group"><label class="form-label">公司地址</label><input type="text" class="form-input" v-model="form.address"></div>
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">电话</label><input type="text" class="form-input" v-model="form.phone"></div>
            <div class="form-group"><label class="form-label">传真</label><input type="text" class="form-input" v-model="form.fax"></div>
            <div class="form-group"><label class="form-label">邮箱</label><input type="email" class="form-input" v-model="form.email"></div>
          </div>
          <div class="form-group"><label class="form-label">网站</label><input type="url" class="form-input" v-model="form.website"></div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">财务信息</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-3">
            <div class="form-group"><label class="form-label">税号</label><input type="text" class="form-input" v-model="form.taxNo"></div>
            <div class="form-group"><label class="form-label">开户银行</label><input type="text" class="form-input" v-model="form.bank"></div>
            <div class="form-group"><label class="form-label">银行账号</label><input type="text" class="form-input" v-model="form.bankAccount"></div>
          </div>
        </div>
      </div>

      <div class="panel-card" style="margin-top:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">安全与合规</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">数据加密</label>
              <select class="form-select" v-model="form.encryption">
                <option value="aes256">AES-256</option>
                <option value="aes128">AES-128</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">日志保留天数</label>
              <input type="number" class="form-input" v-model.number="form.logRetention" min="7" max="365">
            </div>
            <div class="form-group">
              <label class="form-label">GDPR/PIPL合规模式</label>
              <select class="form-select" v-model="form.compliance">
                <option value="pipl">中国PIPL</option>
                <option value="gdpr">欧盟GDPR</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'branches'">
      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">🏢</div><div class="stat-card-value">{{ compStore.branchCount }}</div><div class="stat-card-label">分支机构</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-success-subtle);color:var(--color-success)">✅</div><div class="stat-card-value">{{ compStore.branches.filter(b => b.status === 'active').length }}</div><div class="stat-card-label">运营中</div></div>
      </div>
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div></div>
        <div class="page-header-actions"><button class="btn btn-primary" @click="openBranchModal">➕ 新增分支</button></div>
      </div>
      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>机构名称</th><th>编码</th><th>负责人</th><th>地址</th><th>电话</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-if="compStore.branches.length === 0"><td colspan="7" class="empty-state">暂无分支机构</td></tr>
                <tr v-for="br in compStore.branches" :key="br.id">
                  <td>{{ br.name }}</td><td>{{ br.code }}</td><td>{{ br.manager }}</td><td>{{ br.address }}</td><td>{{ br.phone }}</td>
                  <td><span class="status-badge" :class="br.status === 'active' ? 'success' : 'neutral'">{{ br.status === 'active' ? '运营中' : '停用' }}</span></td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="editBranch(br)">编辑</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteBranch(br.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'departments'">
      <div class="stats-row" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-accent-subtle);color:var(--color-accent)">🏛️</div><div class="stat-card-value">{{ compStore.deptCount }}</div><div class="stat-card-label">部门数</div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-info-subtle);color:var(--color-info)">👥</div><div class="stat-card-value">{{ compStore.staffCount }}</div><div class="stat-card-label">总人数</div></div>
      </div>
      <div class="page-header" style="margin-bottom:var(--space-3)">
        <div></div>
        <div class="page-header-actions"><button class="btn btn-primary" @click="openDeptModal">➕ 新增部门</button></div>
      </div>
      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>部门名称</th><th>编码</th><th>上级部门</th><th>负责人</th><th>人数</th><th>所属分支</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-if="compStore.departments.length === 0"><td colspan="8" class="empty-state">暂无部门</td></tr>
                <tr v-for="dept in compStore.departments" :key="dept.id">
                  <td>{{ dept.name }}</td><td>{{ dept.code }}</td><td>{{ dept.parent || '-' }}</td><td>{{ dept.manager }}</td><td>{{ dept.staffCount }}</td><td>{{ getBranchName(dept.branch) }}</td>
                  <td><span class="status-badge" :class="dept.status === 'active' ? 'success' : 'neutral'">{{ dept.status === 'active' ? '正常' : '停用' }}</span></td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="editDept(dept)">编辑</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="deleteDept(dept.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showBranchModal" class="modal-overlay" @click.self="showBranchModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingBranch ? '编辑分支' : '新增分支' }}</span><button class="modal-close" @click="showBranchModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">机构名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="branchForm.name"></div>
            <div class="form-group"><label class="form-label">编码</label><input type="text" class="form-input" v-model="branchForm.code"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">负责人</label><input type="text" class="form-input" v-model="branchForm.manager"></div>
            <div class="form-group"><label class="form-label">电话</label><input type="text" class="form-input" v-model="branchForm.phone"></div>
          </div>
          <div class="form-group"><label class="form-label">地址</label><input type="text" class="form-input" v-model="branchForm.address"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showBranchModal = false">取消</button><button class="btn btn-primary" @click="submitBranch">保存</button></div>
      </div>
    </div>

    <div v-if="showDeptModal" class="modal-overlay" @click.self="showDeptModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingDept ? '编辑部门' : '新增部门' }}</span><button class="modal-close" @click="showDeptModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">部门名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="deptForm.name"></div>
            <div class="form-group"><label class="form-label">编码</label><input type="text" class="form-input" v-model="deptForm.code"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">上级部门</label><select class="form-select" v-model="deptForm.parent"><option value="">无（顶级部门）</option><option v-for="d in compStore.departments" :key="d.id" :value="d.name">{{ d.name }}</option></select></div>
            <div class="form-group"><label class="form-label">负责人</label><input type="text" class="form-input" v-model="deptForm.manager"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">人数</label><input type="number" class="form-input" v-model.number="deptForm.staffCount" min="0"></div>
            <div class="form-group"><label class="form-label">所属分支</label><select class="form-select" v-model="deptForm.branch"><option value="">请选择</option><option v-for="br in compStore.branches" :key="br.id" :value="br.code">{{ br.name }}</option></select></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showDeptModal = false">取消</button><button class="btn btn-primary" @click="submitDept">保存</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'

const compStore = useCompanyStore()

const tabs = [
  { key: 'basic', label: '🏢 基本信息' },
  { key: 'branches', label: '🏗️ 分支机构' },
  { key: 'departments', label: '🏛️ 部门管理' }
]

const activeTab = ref('basic')
const showBranchModal = ref(false)
const showDeptModal = ref(false)
const editingBranch = ref(null)
const editingDept = ref(null)

const form = reactive({ ...compStore.companyInfo, encryption: compStore.companyInfo.encryption || 'aes256', logRetention: compStore.companyInfo.logRetention || 90, compliance: compStore.companyInfo.compliance || 'pipl' })
const branchForm = reactive({ name: '', code: '', manager: '', address: '', phone: '' })
const deptForm = reactive({ name: '', code: '', parent: '', manager: '', staffCount: 0, branch: '' })

function getBranchName(code) {
  const br = compStore.branches.find(b => b.code === code)
  return br ? br.name : code || '-'
}

function saveCompany() {
  compStore.saveCompanyInfo({ ...form })
  alert('公司信息已保存')
}

function exportCompany() {
  const data = JSON.stringify({ company: compStore.companyInfo, branches: compStore.branches, departments: compStore.departments }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '公司信息_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function openBranchModal() {
  editingBranch.value = null
  Object.assign(branchForm, { name: '', code: '', manager: '', address: '', phone: '' })
  showBranchModal.value = true
}

function editBranch(br) {
  editingBranch.value = br
  Object.assign(branchForm, { name: br.name, code: br.code, manager: br.manager, address: br.address, phone: br.phone })
  showBranchModal.value = true
}

function submitBranch() {
  if (!branchForm.name) { alert('请填写机构名称'); return }
  if (editingBranch.value) {
    compStore.updateBranch(editingBranch.value.id, { ...branchForm })
  } else {
    compStore.addBranch({ ...branchForm })
  }
  showBranchModal.value = false
}

function deleteBranch(id) { if (confirm('确认删除该分支？')) compStore.deleteBranch(id) }

function openDeptModal() {
  editingDept.value = null
  Object.assign(deptForm, { name: '', code: '', parent: '', manager: '', staffCount: 0, branch: '' })
  showDeptModal.value = true
}

function editDept(dept) {
  editingDept.value = dept
  Object.assign(deptForm, { name: dept.name, code: dept.code, parent: dept.parent, manager: dept.manager, staffCount: dept.staffCount, branch: dept.branch })
  showDeptModal.value = true
}

function submitDept() {
  if (!deptForm.name) { alert('请填写部门名称'); return }
  if (editingDept.value) {
    compStore.updateDepartment(editingDept.value.id, { ...deptForm })
  } else {
    compStore.addDepartment({ ...deptForm })
  }
  showDeptModal.value = false
}

function deleteDept(id) { if (confirm('确认删除该部门？')) compStore.deleteDepartment(id) }

onMounted(() => { compStore.initSeedData() })
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
.form-row-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
@media (max-width: 768px) {
  .form-row-3 { grid-template-columns: 1fr; }
}
</style>
