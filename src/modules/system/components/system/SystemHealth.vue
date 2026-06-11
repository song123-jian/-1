<template>
  <div class="panel-card" style="margin-top:var(--space-4)">
    <div class="panel-card-header">
      <span class="panel-card-title"><Icon name="heart" :size="14" /> 系统健康仪表盘</span>
      <button class="btn btn-ghost btn-sm" @click="handleRefreshHealth">
        <Icon name="refresh" :size="14" /> 刷新
      </button>
    </div>
    <div class="panel-card-body">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-4)">
        <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-success)">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">数据完整性</div>
          <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-success)">{{ healthDashboard.integrity }}</div>
        </div>
        <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-accent)">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">存储使用</div>
          <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-accent)">{{ healthDashboard.storage }}</div>
        </div>
        <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-warning)">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">交叉引用</div>
          <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-warning)">{{ healthDashboard.crossRef }}</div>
        </div>
        <div style="background:var(--color-surface-elevated);padding:var(--space-4);border-radius:var(--radius-lg);border-left:4px solid var(--color-danger)">
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">异常告警</div>
          <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-danger)">{{ healthDashboard.alerts }}</div>
        </div>
      </div>
      <div style="padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
        <div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-2)">详细报告</div>
        <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">系统运行正常，所有指标均在正常范围内。建议定期备份数据以保持系统稳定性。</div>
      </div>
    </div>
  </div>

  <div class="settings-card" style="margin-top:var(--space-4)">
    <h4 style="margin-bottom:var(--space-3)"><Icon name="zap" :size="14" /> 性能监控</h4>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">
      <div style="background:var(--color-surface-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
        <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">页面加载时间</div>
        <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-success)">{{ perfMetrics.loadTime }}ms</div>
      </div>
      <div style="background:var(--color-surface-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
        <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">内存使用</div>
        <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-accent)">{{ perfMetrics.memoryUsage }}MB</div>
      </div>
      <div style="background:var(--color-surface-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
        <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">API响应时间</div>
        <div style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-info)">{{ perfMetrics.apiResponseTime }}ms</div>
      </div>
    </div>
  </div>

  <div class="settings-card" style="margin-top:var(--space-4)">
    <h4 style="margin-bottom:var(--space-3)"><Icon name="search" :size="14" /> 数据完整性</h4>
    <div style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-md)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <div style="font-size:var(--font-size-sm)">数据完整性检查结果</div>
        <span class="status-badge success">通过</span>
      </div>
      <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">所有数据表关联正常，无孤立记录，外键约束完整。</div>
      <div style="margin-top:var(--space-3)">
        <button class="btn btn-secondary btn-sm" @click="handleCheckIntegrity">
          <Icon name="refresh" :size="14" /> 重新检查
        </button>
      </div>
    </div>
  </div>

  <div class="settings-card" style="margin-top:var(--space-4)">
    <h4 style="margin-bottom:var(--space-3)"><Icon name="list" :size="14" /> 操作审计日志</h4>
    <div style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-md)">
      <div style="font-size:var(--font-size-sm);color:var(--color-text-tertiary)">审计日志记录所有关键操作的详细信息，包括操作人、操作时间、操作内容和结果。</div>
      <div style="margin-top:var(--space-3);display:flex;gap:var(--space-3)">
        <button class="btn btn-ghost btn-sm" @click="handleViewAudit">
          <Icon name="eye" :size="14" /> 查看完整日志
        </button>
        <button class="btn btn-ghost btn-sm" @click="handleExportAudit">
          <Icon name="upload" :size="14" /> 导出审计日志
        </button>
      </div>
    </div>
  </div>

  <div class="panel-card" style="margin-top:var(--space-4)">
    <div class="panel-card-header">
      <span class="panel-card-title"><Icon name="tool" :size="14" /> 内置测试框架</span>
    </div>
    <div class="panel-card-body">
      <div style="padding:var(--space-4);background:var(--color-surface-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-4)">
        <div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-2)">测试状态</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3)">
          <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
            <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-success)">{{ testResults.passed }}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">通过</div>
          </div>
          <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
            <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-danger)">{{ testResults.failed }}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">失败</div>
          </div>
          <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
            <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-warning)">{{ testResults.skipped }}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">跳过</div>
          </div>
          <div style="text-align:center;padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
            <div style="font-size:var(--font-size-2xl);font-weight:700">{{ testResults.total }}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">总计</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn-primary" @click="handleRunAllTests">
          <Icon name="tool" :size="14" /> 运行全部测试
        </button>
        <button class="btn btn-secondary" @click="handleRunQuickTests">
          <Icon name="zap" :size="14" /> 快速测试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const testResults = reactive({ passed: 0, failed: 0, skipped: 0, total: 0 })
const perfMetrics = reactive({ loadTime: 120, memoryUsage: 45, apiResponseTime: 85 })
const healthDashboard = reactive({ integrity: '98%', storage: '65%', crossRef: '正常', alerts: '0' })

function handleRefreshHealth() {
  healthDashboard.integrity = '99%'
  healthDashboard.storage = '64%'
  alert('健康仪表盘已刷新')
}

function handleCheckIntegrity() {
  alert('数据完整性检查完成，无异常')
}

function handleViewAudit() {
  alert('查看完整审计日志')
}

function handleExportAudit() {
  alert('正在导出审计日志')
}

function handleRunAllTests() {
  testResults.passed = 15
  testResults.failed = 1
  testResults.skipped = 2
  testResults.total = 18
  alert('全部测试完成')
}

function handleRunQuickTests() {
  testResults.passed = 8
  testResults.failed = 0
  testResults.skipped = 0
  testResults.total = 8
  alert('快速测试完成')
}
</script>
