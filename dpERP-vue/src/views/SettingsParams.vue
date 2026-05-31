<template>
  <div class="sysparams-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">系统参数</h2>
        <p class="page-header-subtitle">配置业务规则、财务参数和系统运行参数</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="saveAll">💾 保存全部</button>
        <button class="btn btn-ghost" @click="resetAll">🔄 恢复默认</button>
      </div>
    </div>

    <div class="tab-bar">
      <button v-for="tab in spStore.paramGroups" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.icon }} {{ tab.label }}</button>
      <button class="tab-btn" :class="{ active: activeTab === 'logs' }" @click="activeTab = 'logs'">📝 变更日志</button>
    </div>

    <div v-if="activeTab === 'general'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">财务参数</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">默认货币</label>
              <select class="form-select" v-model="form.currency">
                <option value="CNY">人民币 (CNY ¥)</option>
                <option value="USD">美元 (USD $)</option>
                <option value="EUR">欧元 (EUR €)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">税率 (%)</label>
              <input type="number" class="form-input" v-model.number="form.taxRate" min="0" max="100" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">小数位数</label>
              <select class="form-select" v-model="form.decimals">
                <option value="2">2位</option>
                <option value="3">3位</option>
                <option value="4">4位</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">系统运行参数</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">库存计价方法</label>
              <select class="form-select" v-model="form.costingMethod">
                <option value="weighted_avg">加权平均</option>
                <option value="fifo">先进先出 (FIFO)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">会话超时（小时）</label>
              <input type="number" class="form-input" v-model.number="form.sessionTimeoutHours" min="1" max="24">
            </div>
            <div class="form-group">
              <label class="form-label">自动备份</label>
              <select class="form-select" v-model="form.autoBackup">
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="off">关闭</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">系统信息</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">系统名称</label><input type="text" class="form-input" v-model="form.systemName"></div>
            <div class="form-group"><label class="form-label">系统版本</label><input type="text" class="form-input" v-model="form.systemVersion" readonly style="background:var(--color-bg-tertiary)"></div>
          </div>
        </div>
      </div>
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">区域与格式</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">语言</label><select class="form-select" v-model="form.language"><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="en-US">English</option></select></div>
            <div class="form-group"><label class="form-label">时区</label><select class="form-select" v-model="form.timezone"><option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option><option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option><option value="America/New_York">America/New_York (UTC-5)</option><option value="Europe/London">Europe/London (UTC+0)</option></select></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">日期格式</label><select class="form-select" v-model="form.dateFormat"><option value="YYYY-MM-DD">YYYY-MM-DD</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option></select></div>
            <div class="form-group"><label class="form-label">时间格式</label><select class="form-select" v-model="form.timeFormat"><option value="HH:mm:ss">24小时制</option><option value="hh:mm:ss A">12小时制</option></select></div>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" @click="spStore.resetGroup('general')">恢复本组默认</button>
    </div>

    <div v-if="activeTab === 'security'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">会话与登录</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">会话超时(分钟)</label><input type="number" class="form-input" v-model.number="form.sessionTimeout" min="5" max="480"></div>
            <div class="form-group"><label class="form-label">最大登录尝试次数</label><input type="number" class="form-input" v-model.number="form.maxLoginAttempts" min="1" max="10"></div>
          </div>
        </div>
      </div>
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">密码策略</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">最小密码长度</label><input type="number" class="form-input" v-model.number="form.passwordMinLength" min="6" max="32"></div>
            <div class="form-group"><label class="form-label"><input type="checkbox" v-model="form.passwordComplexity"> 密码复杂度要求 <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">（大小写+数字+特殊字符）</span></label></div>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" @click="spStore.resetGroup('security')">恢复本组默认</button>
    </div>

    <div v-if="activeTab === 'backup'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">自动备份</span></div>
        <div class="panel-card-body">
          <div class="form-group"><label class="form-label"><input type="checkbox" v-model="form.backupEnabled"> 启用自动备份</label></div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">备份频率</label><select class="form-select" v-model="form.backupInterval"><option value="hourly">每小时</option><option value="daily">每日</option><option value="weekly">每周</option><option value="monthly">每月</option></select></div>
            <div class="form-group"><label class="form-label">备份保留天数</label><input type="number" class="form-input" v-model.number="form.backupRetention" min="7" max="365"></div>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">手动操作</span></div>
        <div class="panel-card-body" style="display:flex;gap:var(--space-3)">
          <button class="btn btn-ghost" @click="manualBackup">💾 立即备份</button>
          <button class="btn btn-ghost" @click="restoreBackup">📂 恢复备份</button>
        </div>
      </div>
      <div style="margin-top:var(--space-3)"><button class="btn btn-ghost btn-sm" @click="spStore.resetGroup('backup')">恢复本组默认</button></div>
    </div>

    <div v-if="activeTab === 'notification'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">邮件通知</span></div>
        <div class="panel-card-body">
          <div class="form-group"><label class="form-label"><input type="checkbox" v-model="form.emailEnabled"> 启用邮件通知</label></div>
          <div v-if="form.emailEnabled">
            <div class="form-row form-row-2">
              <div class="form-group"><label class="form-label">SMTP服务器</label><input type="text" class="form-input" v-model="form.smtpHost" placeholder="smtp.example.com"></div>
              <div class="form-group"><label class="form-label">端口</label><input type="number" class="form-input" v-model.number="form.smtpPort" placeholder="465"></div>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group"><label class="form-label">用户名</label><input type="text" class="form-input" v-model="form.smtpUser"></div>
              <div class="form-group"><label class="form-label">密码</label><input type="password" class="form-input" v-model="form.smtpPass"></div>
            </div>
            <div class="form-group"><label class="form-label">发件人地址</label><input type="email" class="form-input" v-model="form.emailFrom"></div>
            <button class="btn btn-ghost btn-sm" @click="testEmail">📨 发送测试邮件</button>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">短信通知</span></div>
        <div class="panel-card-body">
          <div class="form-group"><label class="form-label"><input type="checkbox" v-model="form.smsEnabled"> 启用短信通知</label></div>
          <div v-if="form.smsEnabled">
            <div class="form-row form-row-2">
              <div class="form-group"><label class="form-label">短信服务商</label><select class="form-select" v-model="form.smsProvider"><option value="aliyun">阿里云</option><option value="tencent">腾讯云</option><option value="huawei">华为云</option></select></div>
              <div class="form-group"><label class="form-label">API Key</label><input type="password" class="form-input" v-model="form.smsApiKey"></div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="testSms">📱 发送测试短信</button>
          </div>
        </div>
      </div>
      <div style="margin-top:var(--space-3)"><button class="btn btn-ghost btn-sm" @click="spStore.resetGroup('notification')">恢复本组默认</button></div>
    </div>

    <div v-if="activeTab === 'performance'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">API与缓存</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">API速率限制(次/分钟)</label><input type="number" class="form-input" v-model.number="form.apiRateLimit" min="10" max="10000"></div>
            <div class="form-group"><label class="form-label">API超时时间(秒)</label><input type="number" class="form-input" v-model.number="form.apiTimeout" min="5" max="300"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label"><input type="checkbox" v-model="form.cacheEnabled"> 启用缓存</label></div>
            <div class="form-group"><label class="form-label">缓存TTL(秒)</label><input type="number" class="form-input" v-model.number="form.cacheTTL" min="60" max="86400"></div>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">维护模式</span></div>
        <div class="panel-card-body">
          <div class="form-group"><label class="form-label"><input type="checkbox" v-model="form.maintenanceMode"> 启用维护模式 <span style="font-size:var(--font-size-xs);color:var(--color-danger)">⚠️ 开启后普通用户无法访问系统</span></label></div>
          <div v-if="form.maintenanceMode" class="form-group"><label class="form-label">维护提示信息</label><input type="text" class="form-input" v-model="form.maintenanceMessage"></div>
        </div>
      </div>
      <div style="margin-top:var(--space-3)"><button class="btn btn-ghost btn-sm" @click="spStore.resetGroup('performance')">恢复本组默认</button></div>
    </div>

    <div v-if="activeTab === 'logs'">
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">参数变更日志</span></div>
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>详情</th></tr></thead>
              <tbody>
                <tr v-if="spStore.logs.length === 0"><td colspan="4" class="empty-state">暂无变更记录</td></tr>
                <tr v-for="log in spStore.logs.slice(0, 50)" :key="log.time + log.action">
                  <td>{{ log.time }}</td><td>{{ log.user }}</td><td>{{ log.action }}</td><td>{{ log.detail }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useSystemParamsStore } from '@/stores/systemParams'

const spStore = useSystemParamsStore()

const activeTab = ref('general')
const form = reactive({ ...spStore.params, currency: spStore.params.currency || 'CNY', taxRate: spStore.params.taxRate ?? 13, decimals: spStore.params.decimals || '2', costingMethod: spStore.params.costingMethod || 'weighted_avg', sessionTimeoutHours: spStore.params.sessionTimeoutHours ?? 8, autoBackup: spStore.params.autoBackup || 'daily' })

function saveAll() {
  spStore.saveParams({ ...form })
  alert('系统参数已保存')
}

function resetAll() {
  if (confirm('确认恢复所有参数为默认值？')) {
    spStore.resetParams()
    Object.assign(form, spStore.params)
  }
}

function manualBackup() { alert('手动备份已触发') }
function restoreBackup() { alert('请选择备份文件进行恢复') }
function testEmail() { spStore.testEmail(); alert('测试邮件已发送') }
function testSms() { spStore.testSms(); alert('测试短信已发送') }

onMounted(() => { spStore.initSeedData() })
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
