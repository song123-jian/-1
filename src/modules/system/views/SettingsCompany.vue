<template>
  <div class="settings-company-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">公司信息</h2>
        <p class="page-header-subtitle">管理企业基本信息、安全与合规配置</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="saveSettings">
          <Icon name="save" :size="14" />
          保存设置
        </button>
      </div>
    </div>

    <div class="panel-card" style="margin-bottom: var(--space-4)">
      <div class="panel-card-header"><span class="panel-card-title">公司基本信息</span></div>
      <div class="panel-card-body">
        <div class="form-group">
          <label class="form-label">
            公司名称
            <span class="required">*</span>
          </label>
          <input v-model="form.companyName" type="text" class="form-input" placeholder="公司全称" />
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1)">
            注册公司全称，将显示在报价单、合同等文档中
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">简称</label>
          <input v-model="form.shortName" type="text" class="form-input" placeholder="公司简称" />
        </div>
        <div class="form-group">
          <label class="form-label">联系电话</label>
          <input v-model="form.phone" type="text" class="form-input" placeholder="联系电话" />
        </div>
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input v-model="form.email" type="email" class="form-input" placeholder="邮箱地址" />
        </div>
        <div class="form-group">
          <label class="form-label">地址</label>
          <textarea v-model="form.address" class="form-input" rows="3" placeholder="公司地址"></textarea>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header"><span class="panel-card-title">安全与合规</span></div>
      <div class="panel-card-body">
        <div class="form-group">
          <label class="form-label">数据加密</label>
          <select v-model="form.encryption" class="form-select">
            <option value="aes256">AES-256</option>
            <option value="aes128">AES-128</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">日志保留天数</label>
          <input v-model.number="form.logRetention" type="number" class="form-input" min="7" max="365" />
        </div>
        <div class="form-group">
          <label class="form-label">GDPR/PIPL合规模式</label>
          <select v-model="form.compliance" class="form-select">
            <option value="pipl">中国PIPL</option>
            <option value="gdpr">欧盟GDPR</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'SettingsCompany' }
</script>
<script setup>
import { reactive, onMounted } from 'vue'

const STORAGE_KEY = 'gj_erp_companyInfo'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return fallback
}
function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    /* ignore */
  }
}

const form = reactive(
  load(STORAGE_KEY, {
    companyName: '冠久科技有限公司',
    shortName: '冠久科技',
    phone: '021-6888XXXX',
    email: 'contact@guanjiu.com',
    address: '上海市浦东新区XXX路XXX号',
    encryption: 'aes256',
    logRetention: 90,
    compliance: 'pipl'
  })
)

function saveSettings() {
  persist(STORAGE_KEY, { ...form })
  alert('公司信息和系统参数已更新')
}

onMounted(() => {
  const saved = load(STORAGE_KEY, null)
  if (saved) Object.assign(form, saved)
})
</script>

<style scoped>
/* 响应式适配 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .page-header-actions {
    flex-wrap: wrap;
  }
  .form-row-2 {
    flex-direction: column;
    gap: 0;
  }
}
</style>
