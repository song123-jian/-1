<template>
  <div class="docsettings-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">资质设置</h2>
        <p class="page-header-subtitle">资质证照管理、到期预警、开票资料、合规监控</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openQualModal">
          <Icon name="add" :size="14" />
          新增资质
        </button>
        <button class="btn btn-ghost" @click="checkCompliance">
          <Icon name="search" :size="14" />
          合规检查
        </button>
        <button class="btn btn-ghost" @click="exportQuals">
          <Icon name="upload" :size="14" />
          导出清单
        </button>
      </div>
    </div>

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <Icon v-if="tab.icon" :name="tab.icon" :size="14" />
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'config'">
      <div class="panel-card" style="margin-bottom: var(--space-6)">
        <div class="panel-card-header"><span class="panel-card-title">提醒与规则配置</span></div>
        <div class="panel-card-body">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                营业执照到期提醒天数
                <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">（1-365天）</span>
              </label>
              <input v-model.number="editSettings.licenseDays" class="form-input" type="number" min="1" max="365" />
            </div>
            <div class="form-group">
              <label class="form-label">
                开票资料完整性阈值(%)
                <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">（0-100）</span>
              </label>
              <input v-model.number="editSettings.completeness" class="form-input" type="number" min="0" max="100" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">
              <input v-model="editSettings.autoFreeze" type="checkbox" />
              到期自动冻结交易
              <span style="font-size: var(--font-size-xs); color: var(--color-danger)">
                <Icon name="warning" :size="14" />
                关闭此选项需管理员权限
              </span>
            </label>
          </div>
          <div class="form-group">
            <label class="form-label">提醒方式</label>
            <label style="margin-right: var(--space-4)">
              <input v-model="editSettings.notifySys" type="checkbox" />
              系统通知
            </label>
            <label style="margin-right: var(--space-4)">
              <input v-model="editSettings.notifyEmail" type="checkbox" />
              邮件
            </label>
            <label>
              <input v-model="editSettings.notifyWecom" type="checkbox" />
              企业微信
            </label>
          </div>
          <div class="form-group">
            <label class="form-label">提醒频率</label>
            <select v-model="editSettings.remindFreq" class="form-select" style="width: auto">
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="onExpiry">到期时</option>
            </select>
          </div>
          <div class="form-group" style="margin-top: var(--space-3)">
            <label class="form-label">快速预设</label>
            <div style="display: flex; gap: var(--space-2)">
              <button class="btn btn-ghost btn-sm" @click="applyPreset('strict')">严格模式</button>
              <button class="btn btn-ghost btn-sm" @click="applyPreset('standard')">
                <Icon name="list" :size="14" />
                标准模式
              </button>
              <button class="btn btn-ghost btn-sm" @click="applyPreset('loose')">宽松模式</button>
            </div>
          </div>
          <button class="btn btn-primary" style="margin-top: var(--space-4)" @click="saveSettings">
            <Icon name="save" :size="14" />
            保存设置
          </button>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">合规规则摘要</span></div>
        <div class="panel-card-body">
          <div style="display: flex; gap: var(--space-4); flex-wrap: wrap">
            <div
              style="
                flex: 1;
                min-width: 200px;
                background: var(--color-success-subtle);
                border-radius: var(--radius-md);
                padding: var(--space-4);
              "
            >
              <div style="font-weight: 600; color: var(--color-success); margin-bottom: var(--space-2)">PIPL 合规</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
                个人信息保护法 —
                <span
                  :style="{ color: dsStore.complianceScore >= 80 ? 'var(--color-success)' : 'var(--color-danger)' }"
                >
                  {{ dsStore.complianceScore >= 80 ? '合规' : '待整改' }}
                </span>
              </div>
            </div>
            <div
              style="
                flex: 1;
                min-width: 200px;
                background: var(--color-info-subtle);
                border-radius: var(--radius-md);
                padding: var(--space-4);
              "
            >
              <div style="font-weight: 600; color: var(--color-info); margin-bottom: var(--space-2)">GDPR 合规</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
                通用数据保护条例 —
                <span
                  :style="{ color: dsStore.complianceScore >= 80 ? 'var(--color-success)' : 'var(--color-danger)' }"
                >
                  {{ dsStore.complianceScore >= 80 ? '合规' : '待整改' }}
                </span>
              </div>
            </div>
            <div
              style="
                flex: 1;
                min-width: 200px;
                background: var(--color-accent-subtle);
                border-radius: var(--radius-md);
                padding: var(--space-4);
              "
            >
              <div style="font-weight: 600; color: var(--color-accent); margin-bottom: var(--space-2)">ISO 37301</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
                合规管理体系 —
                <span
                  :style="{ color: dsStore.complianceScore >= 80 ? 'var(--color-success)' : 'var(--color-danger)' }"
                >
                  {{ dsStore.complianceScore >= 80 ? '合规' : '待整改' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'quals'">
      <div class="stats-row" style="margin-bottom: var(--space-4)">
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
            <Icon name="list" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.qualTotal }}</div>
          <div class="stat-card-label">资质总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
            <Icon name="check" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.qualActive }}</div>
          <div class="stat-card-label">有效资质</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
            <Icon name="bell" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.qualExpiring }}</div>
          <div class="stat-card-label">即将到期</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-danger-subtle); color: var(--color-danger)">
            <Icon name="close" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.qualExpired }}</div>
          <div class="stat-card-label">已过期</div>
        </div>
      </div>
      <div class="filter-bar" style="margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2)">
        <input
          v-model="qualSearch"
          type="text"
          class="form-input"
          placeholder="搜索资质名称/编号..."
          style="min-width: 180px"
        />
        <select v-model="qualTypeFilter" class="form-select">
          <option value="">全部类型</option>
          <option v-for="(label, key) in dsStore.qualTypeLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-model="qualStatusFilter" class="form-select">
          <option value="">全部状态</option>
          <option v-for="(label, key) in dsStore.qualStatusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>资质名称</th>
                  <th>类型</th>
                  <th>证照编号</th>
                  <th>发证机关</th>
                  <th>签发日期</th>
                  <th>到期日期</th>
                  <th>状态</th>
                  <th>预警</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredQuals.length === 0">
                  <td colspan="9" class="empty-state">
                    <Icon name="list" :size="14" />
                    暂无资质证照，点击'新增资质'开始添加
                  </td>
                </tr>
                <tr v-for="q in filteredQuals" :key="q.id">
                  <td>{{ q.name }}</td>
                  <td>{{ dsStore.qualTypeLabels[q.type] || q.type }}</td>
                  <td>{{ q.certNo }}</td>
                  <td>{{ q.issuer }}</td>
                  <td>{{ q.issueDate }}</td>
                  <td>{{ q.expiryDate }}</td>
                  <td>
                    <span class="status-badge" :class="qualStatusClass(q.status)">
                      {{ dsStore.qualStatusLabels[q.status] || q.status }}
                    </span>
                  </td>
                  <td>
                    <span v-if="q.warning" style="font-size: var(--font-size-xs); color: var(--color-warning)">
                      {{ q.warning }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="viewQual(q)">
                      <Icon name="eye" :size="14" />
                      查看
                    </button>
                    <button class="btn btn-ghost btn-sm" @click="editQual(q)">
                      <Icon name="edit" :size="14" />
                      编辑
                    </button>
                    <button
                      v-if="q.status === 'expired' || q.status === 'expiring_soon'"
                      class="btn btn-ghost btn-sm"
                      @click="renewQual(q)"
                    >
                      <Icon name="refresh" :size="14" />
                      续期
                    </button>
                    <button
                      v-if="q.status === 'pending_review'"
                      class="btn btn-ghost btn-sm"
                      style="color: var(--color-success)"
                      @click="approveQual(q.id)"
                    >
                      审核
                    </button>
                    <button class="btn btn-ghost btn-sm" style="color: var(--color-danger)" @click="revokeQual(q.id)">
                      <Icon name="close" :size="14" />
                      作废
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'invoice'">
      <div class="page-header" style="margin-bottom: var(--space-3)">
        <div></div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="openInvoiceModal">
            <Icon name="add" :size="14" />
            新增开票资料
          </button>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>公司名称</th>
                  <th>税号</th>
                  <th>开户银行</th>
                  <th>银行账号</th>
                  <th>地址</th>
                  <th>电话</th>
                  <th>发票类型</th>
                  <th>默认</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="dsStore.invoiceProfiles.length === 0">
                  <td colspan="9" class="empty-state">
                    <Icon name="file" :size="14" />
                    暂无开票资料，点击'新增开票资料'开始添加
                  </td>
                </tr>
                <tr v-for="inv in dsStore.invoiceProfiles" :key="inv.id">
                  <td>{{ inv.companyName }}</td>
                  <td>{{ inv.taxNo }}</td>
                  <td>{{ inv.bank }}</td>
                  <td
                    style="
                      font-family: var(--font-mono);
                      font-size: var(--font-size-xs);
                      overflow-wrap: break-word;
                      word-wrap: break-word;
                    "
                  >
                    {{ inv.bankAccount }}
                  </td>
                  <td>{{ inv.address }}</td>
                  <td>{{ inv.phone }}</td>
                  <td>{{ inv.invoiceType }}</td>
                  <td>
                    <span class="status-badge" :class="inv.isDefault ? 'success' : 'neutral'">
                      {{ inv.isDefault ? '默认' : '-' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-sm" @click="editInvoice(inv)">
                      <Icon name="edit" :size="14" />
                      编辑
                    </button>
                    <button v-if="!inv.isDefault" class="btn btn-ghost btn-sm" @click="setDefaultInvoice(inv.id)">
                      设为默认
                    </button>
                    <button
                      class="btn btn-ghost btn-sm"
                      style="color: var(--color-danger)"
                      @click="deleteInvoice(inv.id)"
                    >
                      <Icon name="close" :size="14" />
                      删除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'compliance'">
      <div class="stats-row" style="margin-bottom: var(--space-4)">
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
            <Icon name="shield" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.complianceScore }}</div>
          <div class="stat-card-label">合规评分</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
            <Icon name="list" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.qualTotal }}</div>
          <div class="stat-card-label">资质总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
            <Icon name="warning" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.riskCount }}</div>
          <div class="stat-card-label">风险项</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
            <Icon name="chart" :size="14" />
          </div>
          <div class="stat-card-value">{{ dsStore.complianceRate }}</div>
          <div class="stat-card-label">合规率</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4)">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="calendar" :size="14" />
              资质到期时间线
            </span>
          </div>
          <div class="panel-card-body"><canvas ref="timelineChartRef" style="width: 100%; height: 260px"></canvas></div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-title">
              <Icon name="chart" :size="14" />
              资质类型分布
            </span>
          </div>
          <div class="panel-card-body"><canvas ref="typeChartRef" style="width: 100%; height: 260px"></canvas></div>
        </div>
      </div>
      <div class="panel-card" style="margin-top: var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title">[警报] 风险清单</span></div>
        <div class="panel-card-body" style="max-height: 400px; overflow-y: auto">
          <div v-if="riskItems.length === 0" style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">
            暂无风险项
          </div>
          <div
            v-for="r in riskItems"
            :key="r.id"
            style="
              padding: var(--space-3);
              border-bottom: 1px solid var(--color-border);
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
          >
            <div>
              <div style="font-weight: 600; font-size: var(--font-size-sm)">{{ r.name }}</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
                {{ dsStore.qualTypeLabels[r.type] }} · 到期: {{ r.expiryDate }}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-2)">
              <span class="status-badge" :class="r.status === 'expired' ? 'danger' : 'warning'">
                {{ dsStore.qualStatusLabels[r.status] }}
              </span>
              <button class="btn btn-ghost btn-sm" @click="renewQual(r)">
                <Icon name="refresh" :size="14" />
                续期
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'logs'">
      <div class="filter-bar" style="margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2)">
        <input
          v-model="logSearch"
          type="text"
          class="form-input"
          placeholder="搜索操作/用户..."
          style="min-width: 180px"
        />
        <input v-model="logFrom" type="date" class="form-input" style="width: 140px" />
        <input v-model="logTo" type="date" class="form-input" style="width: 140px" />
        <button class="btn btn-ghost btn-sm" @click="exportLogs">
          <Icon name="upload" :size="14" />
          导出日志
        </button>
      </div>
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">配置变更记录</span></div>
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>用户</th>
                  <th>操作</th>
                  <th>变更详情</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredLogs.length === 0"><td colspan="5" class="empty-state">暂无操作记录</td></tr>
                <tr v-for="log in filteredLogs.slice(0, 50)" :key="log.id">
                  <td>{{ log.time }}</td>
                  <td>{{ log.user }}</td>
                  <td>{{ log.action }}</td>
                  <td style="max-width: 300px; overflow-wrap: break-word; word-wrap: break-word">{{ log.detail }}</td>
                  <td>{{ log.ip }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showQualModal" class="modal-overlay" @click.self="showQualModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">{{ editingQual ? '编辑资质' : '新增资质' }}</span>
          <button class="modal-close" @click="showQualModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              资质名称
              <span class="required">*</span>
            </label>
            <input v-model="qualForm.name" type="text" class="form-input" placeholder="资质名称" />
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">类型</label>
              <select v-model="qualForm.type" class="form-select">
                <option v-for="(label, key) in dsStore.qualTypeLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">证照编号</label>
              <input v-model="qualForm.certNo" type="text" class="form-input" placeholder="证照编号" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">发证机关</label>
            <input v-model="qualForm.issuer" type="text" class="form-input" placeholder="发证机关" />
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">签发日期</label>
              <input v-model="qualForm.issueDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">到期日期</label>
              <input v-model="qualForm.expiryDate" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="qualForm.remark" class="form-input" rows="2" placeholder="备注信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showQualModal = false">取消</button>
          <button class="btn btn-primary" @click="submitQual">{{ editingQual ? '保存修改' : '确认添加' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showInvoiceModal" class="modal-overlay" @click.self="showInvoiceModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">{{ editingInvoice ? '编辑开票资料' : '新增开票资料' }}</span>
          <button class="modal-close" @click="showInvoiceModal = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              公司名称
              <span class="required">*</span>
            </label>
            <input v-model="invoiceForm.companyName" type="text" class="form-input" />
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                税号
                <span class="required">*</span>
              </label>
              <input v-model="invoiceForm.taxNo" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">开户银行</label>
              <input v-model="invoiceForm.bank" type="text" class="form-input" />
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">银行账号</label>
              <input v-model="invoiceForm.bankAccount" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">发票类型</label>
              <select v-model="invoiceForm.invoiceType" class="form-select">
                <option value="增值税专用发票">增值税专用发票</option>
                <option value="增值税普通发票">增值税普通发票</option>
                <option value="电子发票">电子发票</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">地址</label>
              <input v-model="invoiceForm.address" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">电话</label>
              <input v-model="invoiceForm.phone" type="text" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">
              <input v-model="invoiceForm.isDefault" type="checkbox" />
              设为默认
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showInvoiceModal = false">取消</button>
          <button class="btn btn-primary" @click="submitInvoice">{{ editingInvoice ? '保存修改' : '确认添加' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DocSettings' }
</script>
<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useDocSettingsStore } from '@/modules/system/stores/docSettings'
import { CJK_SANS_FONT_STACK } from '@/utils/fontStacks'

const dsStore = useDocSettingsStore()

const tabs = [
  { key: 'config', icon: 'setting', label: '基础配置' },
  { key: 'quals', icon: 'list', label: '资质管理' },
  { key: 'invoice', icon: 'file', label: '开票资料' },
  { key: 'compliance', icon: 'chart', label: '合规报告' },
  { key: 'logs', icon: 'check', label: '操作日志' }
]

const activeTab = ref('config')
const qualSearch = ref('')
const qualTypeFilter = ref('')
const qualStatusFilter = ref('')

const logSearch = ref('')
const logFrom = ref('')
const logTo = ref('')

const showQualModal = ref(false)
const showInvoiceModal = ref(false)
const editingQual = ref(null)
const editingInvoice = ref(null)

const timelineChartRef = ref(null)
const typeChartRef = ref(null)

const editSettings = reactive({ ...dsStore.settings })

const qualForm = reactive({
  name: '',
  type: 'business_license',
  certNo: '',
  issuer: '',
  issueDate: '',
  expiryDate: '',
  remark: ''
})
const invoiceForm = reactive({
  companyName: '',
  taxNo: '',
  bank: '',
  bankAccount: '',
  address: '',
  phone: '',
  invoiceType: '增值税专用发票',
  isDefault: false
})

const filteredQuals = computed(() => {
  let list = [...dsStore.qualifications]
  if (qualSearch.value) {
    const q = qualSearch.value.toLowerCase()
    list = list.filter((r) => (r.name || '').toLowerCase().includes(q) || (r.certNo || '').toLowerCase().includes(q))
  }
  if (qualTypeFilter.value) list = list.filter((r) => r.type === qualTypeFilter.value)
  if (qualStatusFilter.value) list = list.filter((r) => r.status === qualStatusFilter.value)
  return list
})

const riskItems = computed(() =>
  dsStore.qualifications.filter((q) => q.status === 'expired' || q.status === 'expiring_soon')
)

const filteredLogs = computed(() => {
  let list = [...dsStore.logs]
  if (logSearch.value) {
    const q = logSearch.value.toLowerCase()
    list = list.filter((l) => (l.action || '').toLowerCase().includes(q) || (l.user || '').toLowerCase().includes(q))
  }
  if (logFrom.value) list = list.filter((l) => l.time && l.time >= logFrom.value)
  if (logTo.value) list = list.filter((l) => l.time && l.time <= logTo.value + ' 23:59:59')
  return list
})

function qualStatusClass(status) {
  const map = {
    active: 'success',
    expiring_soon: 'warning',
    expired: 'danger',
    revoked: 'neutral',
    pending_review: 'info'
  }
  return map[status] || 'neutral'
}

function saveSettings() {
  dsStore.saveSettings({ ...editSettings })
  alert('设置已保存')
}

function applyPreset(preset) {
  dsStore.applyPreset(preset)
  Object.assign(editSettings, dsStore.settings)
}

function checkCompliance() {
  alert('合规检查完成，当前合规评分: ' + dsStore.complianceScore)
}

function exportQuals() {
  const data = JSON.stringify(dsStore.qualifications, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '资质清单_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function exportLogs() {
  const data = JSON.stringify(filteredLogs.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '操作日志_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

function drawTimelineChart() {
  const canvas = timelineChartRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = 260
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const quals = dsStore.qualifications.filter((q) => q.expiryDate)
  if (quals.length === 0) return
  const now = new Date()
  const qualsWithDate = quals
    .map((q) => ({ ...q, expiryDateObj: new Date(q.expiryDate) }))
    .sort((a, b) => a.expiryDateObj - b.expiryDateObj)
  const padding = { top: 20, right: 20, bottom: 40, left: 120 }
  const chartW = canvas.width - padding.left - padding.right
  const chartH = canvas.height - padding.top - padding.bottom
  const minDate = qualsWithDate[0].expiryDateObj.getTime()
  const maxDate = qualsWithDate[qualsWithDate.length - 1].expiryDateObj.getTime()
  const dateRange = maxDate - minDate || 1
  const barH = Math.min(20, chartH / qualsWithDate.length - 4)
  qualsWithDate.forEach((q, i) => {
    const y = padding.top + (chartH / qualsWithDate.length) * i + barH / 2
    const x = padding.left + ((q.expiryDateObj.getTime() - minDate) / dateRange) * chartW
    const isExpired = q.expiryDateObj < now
    const isExpiring = !isExpired && q.expiryDateObj - now < 90 * 24 * 60 * 60 * 1000
    ctx.fillStyle = isExpired ? '#f56c6c' : isExpiring ? '#e6a23c' : '#67c23a'
    ctx.fillRect(padding.left, y, x - padding.left, barH)
    ctx.fillStyle = '#333'
    ctx.font = `10px ${CJK_SANS_FONT_STACK}`
    ctx.textAlign = 'right'
    ctx.fillText(q.name.length > 10 ? q.name.slice(0, 10) + '...' : q.name, padding.left - 5, y + barH / 2 + 3)
    ctx.textAlign = 'left'
    ctx.fillText(q.expiryDate, x + 5, y + barH / 2 + 3)
  })
}

function drawTypeChart() {
  const canvas = typeChartRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = 260
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const typeMap = {}
  dsStore.qualifications.forEach((q) => {
    typeMap[q.type] = (typeMap[q.type] || 0) + 1
  })
  const data = Object.entries(typeMap).map(([type, count]) => ({ type: dsStore.qualTypeLabels[type] || type, count }))
  if (data.length === 0) return
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  const colors = ['#4a90d9', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9b59b6']
  const cx = canvas.width / 2
  const cy = 120
  const r = 80
  let startAngle = -Math.PI / 2
  data.forEach((d, i) => {
    const sliceAngle = (d.count / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.fill()
    const midAngle = startAngle + sliceAngle / 2
    const lx = cx + (r + 25) * Math.cos(midAngle)
    const ly = cy + (r + 25) * Math.sin(midAngle)
    ctx.fillStyle = '#333'
    ctx.font = `11px ${CJK_SANS_FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.fillText(d.type + ' ' + Math.round((d.count / total) * 100) + '%', lx, ly)
    startAngle += sliceAngle
  })
}

watch(activeTab, (val) => {
  if (val === 'compliance') {
    nextTick(() => {
      drawTimelineChart()
      drawTypeChart()
    })
  }
})

function openQualModal() {
  editingQual.value = null
  Object.assign(qualForm, {
    name: '',
    type: 'business_license',
    certNo: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
    remark: ''
  })
  showQualModal.value = true
}

function editQual(q) {
  editingQual.value = q
  Object.assign(qualForm, {
    name: q.name,
    type: q.type,
    certNo: q.certNo,
    issuer: q.issuer,
    issueDate: q.issueDate,
    expiryDate: q.expiryDate,
    remark: q.remark || ''
  })
  showQualModal.value = true
}

function submitQual() {
  if (!qualForm.name) {
    alert('请填写资质名称')
    return
  }
  if (editingQual.value) {
    dsStore.updateQualification(editingQual.value.id, { ...qualForm })
  } else {
    dsStore.addQualification({ ...qualForm })
  }
  showQualModal.value = false
}

function deleteQual(id) {
  if (confirm('确认删除该资质？')) dsStore.deleteQualification(id)
}

function viewQual(q) {
  alert('资质详情: ' + q.name)
}
function renewQual(q) {
  const newDate = prompt('续期资质', '请输入新的到期日期（YYYY-MM-DD）：')
  if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    dsStore.updateQualification(q.id, { expiryDate: newDate })
    alert('续期成功: ' + q.name + ' 已续期至 ' + newDate)
  } else if (newDate) {
    alert('日期格式错误，请输入YYYY-MM-DD格式')
  }
}
function approveQual(id) {
  dsStore.updateQualification(id, { status: 'active' })
  alert('审核通过')
}
function revokeQual(id) {
  if (confirm('确认作废该资质？此操作不可恢复。')) {
    dsStore.updateQualification(id, { status: 'revoked' })
  }
}
function editInvoice(inv) {
  editingInvoice.value = inv
  Object.assign(invoiceForm, {
    companyName: inv.companyName,
    taxNo: inv.taxNo,
    bank: inv.bank,
    bankAccount: inv.bankAccount,
    address: inv.address,
    phone: inv.phone,
    invoiceType: inv.invoiceType,
    isDefault: inv.isDefault
  })
  showInvoiceModal.value = true
}

function openInvoiceModal() {
  editingInvoice.value = null
  Object.assign(invoiceForm, {
    companyName: '',
    taxNo: '',
    bank: '',
    bankAccount: '',
    address: '',
    phone: '',
    invoiceType: '增值税专用发票',
    isDefault: false
  })
  showInvoiceModal.value = true
}

function submitInvoice() {
  if (!invoiceForm.companyName || !invoiceForm.taxNo) {
    alert('请填写公司名称和税号')
    return
  }
  if (editingInvoice.value) {
    dsStore.updateInvoiceProfile(editingInvoice.value.id, { ...invoiceForm })
  } else {
    dsStore.addInvoiceProfile({ ...invoiceForm })
  }
  showInvoiceModal.value = false
}

function setDefaultInvoice(id) {
  dsStore.updateInvoiceProfile(id, { isDefault: true })
}
function deleteInvoice(id) {
  if (confirm('确认删除该开票资料？')) dsStore.deleteInvoiceProfile(id)
}

onBeforeUnmount(() => {
  try {
    if (timelineChartRef.value) {
      const ctx = timelineChartRef.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, timelineChartRef.value.width, timelineChartRef.value.height)
    }
  } catch (e) {
    /* ignore */
  }
  try {
    if (typeChartRef.value) {
      const ctx = typeChartRef.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, typeChartRef.value.width, typeChartRef.value.height)
    }
  } catch (e) {
    /* ignore */
  }
})
</script>

<style scoped>
.tab-bar {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  flex-wrap: wrap;
}
.tab-btn {
  padding: var(--space-2) var(--space-4);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -var(--space-1);
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
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
@keyframes alertDotPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.6);
    opacity: 0.5;
  }
}
@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
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

/* ===== Alert Panel ===== */
.alert-panel {
  animation: statCardIn 0.4s ease-out both;
}
.alert-dot-pulse {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: alertDotPulse 2s ease-in-out infinite;
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

/* ===== Confirm Modal ===== */
.confirm-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.confirm-icon-circle.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .page-header-actions {
    flex-wrap: wrap;
  }
  .tab-bar {
    flex-wrap: wrap;
  }
  .stats-row {
    flex-direction: column;
  }
  .filter-bar {
    flex-direction: column;
  }
  .form-row-2 {
    flex-direction: column;
    gap: 0;
  }
  table {
    font-size: 12px;
  }
}
</style>
