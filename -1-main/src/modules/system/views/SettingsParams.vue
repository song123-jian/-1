<template>
  <div class="settings-params-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">系统参数</h2>
        <p class="page-header-subtitle">配置业务规则、财务参数和系统运行参数</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="saveParams">
          <Icon name="save" :size="14" />
          保存参数
        </button>
      </div>
    </div>

    <div class="panel-card" style="margin-bottom: var(--space-4)">
      <div class="panel-card-header"><span class="panel-card-title">财务参数</span></div>
      <div class="panel-card-body">
        <div class="form-group">
          <label class="form-label">默认货币</label>
          <select v-model="form.currency" class="form-select">
            <option value="CNY">人民币(CNY)</option>
            <option value="USD">美元(USD)</option>
            <option value="EUR">欧元(EUR)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">税率(%)</label>
          <input v-model.number="form.taxRate" type="number" class="form-input" min="0" max="100" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">小数位数</label>
          <select v-model="form.decimals" class="form-select">
            <option :value="2">2位</option>
            <option :value="3">3位</option>
            <option :value="4">4位</option>
          </select>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header"><span class="panel-card-title">系统运行参数</span></div>
      <div class="panel-card-body">
        <div class="form-group">
          <label class="form-label">库存计价方法</label>
          <select v-model="form.costingMethod" class="form-select">
            <option value="weighted_avg">加权平均</option>
            <option value="fifo">先进先出(FIFO)</option>
          </select>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1)">
            加权平均：按所有批次加权计算均价，适合价格波动大的场景；FIFO：先入库的先出库，适合有保质期的物料
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">会话超时(小时)</label>
          <input v-model.number="form.sessionTimeout" type="number" class="form-input" min="1" max="72" />
        </div>
        <div class="form-group">
          <label class="form-label">自动备份</label>
          <select v-model="form.autoBackup" class="form-select">
            <option value="daily">每日</option>
            <option value="weekly">每周</option>
            <option value="off">关闭</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'SettingsParams' }
</script>
<script setup>
import { reactive, onMounted } from 'vue'

const STORAGE_KEY = 'gj_erp_systemParams'

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
    currency: 'CNY',
    taxRate: 13,
    decimals: 2,
    costingMethod: 'weighted_avg',
    sessionTimeout: 8,
    autoBackup: 'daily'
  })
)

function saveParams() {
  if (form.taxRate < 0 || form.taxRate > 100) {
    alert('税率必须在0-100之间')
    return
  }
  if (form.sessionTimeout < 1 || form.sessionTimeout > 72) {
    alert('会话超时必须在1-72小时之间')
    return
  }
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
