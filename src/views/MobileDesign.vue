<template>
  <div class="mobiledesign-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">移动端设计</h2>
        <p class="page-header-subtitle">移动应用启动页与UI设计方案展示 · 5套完整方案</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" style="border-radius:50%;width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center" @click="showHelp = !showHelp">?</button>
      </div>
    </div>

    <div class="filter-bar" style="margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-2)">
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center">
        <button v-for="p in proposals" :key="p.id" class="btn" :class="activeProposal === p.id ? 'btn-primary' : 'btn-secondary'" @click="activeProposal = p.id">{{ p.label }}</button>
      </div>
      <div style="display:flex;gap:var(--space-2);align-items:center;margin-left:auto">
        <div style="display:flex;gap:4px;background:var(--color-bg-tertiary);border-radius:var(--radius-md);padding:2px">
          <button v-for="d in devices" :key="d.key" class="btn btn-ghost btn-sm" :class="{ 'active-device': activeDevice === d.key }" style="padding:4px 8px;font-size:12px" @click="activeDevice = d.key" :title="d.title"><Icon :name="d.icon" :size="14" /> {{ d.label }}</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;background:var(--color-bg-tertiary);border-radius:var(--radius-md);padding:4px 10px">
          <span style="font-size:12px;color:var(--color-text-secondary)">设计稿预览</span>
          <label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer">
            <input type="checkbox" v-model="realtimePreview" style="opacity:0;width:0;height:0">
            <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--color-border);border-radius:20px;transition:0.3s"></span>
            <span style="position:absolute;height:16px;width:16px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:0.3s" :style="{ left: realtimePreview ? '18px' : '2px' }"></span>
          </label>
          <span style="font-size:12px;color:var(--color-text-secondary)">实时预览</span>
        </div>
        <button class="btn btn-secondary btn-sm" @click="exportDesignSpec" title="导出设计规格"><Icon name="download" :size="14" /> 导出设计规格</button>
      </div>
    </div>

    <div style="display:flex;gap:var(--space-4);align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="palette" :size="14" /> 方案预览 · {{ currentProposalName }}</span></div>
          <div class="panel-card-body" style="display:flex;justify-content:center;padding:var(--space-6)">
            <div class="phone-frame" :style="phoneFrameStyle">
              <div class="phone-status-bar"><span>9:41</span><span>[信号] [电池]</span></div>
              <div class="phone-content" :style="phoneContentStyle">
                <div style="padding:16px;height:100%;overflow-y:auto">
                  <div :style="{ background: currentSpec.colors.primary, color: '#fff', padding: '12px 16px', borderRadius: currentSpec.components.borderRadius, marginBottom: '12px', fontWeight: 600 }">dpERP 移动端</div>
                  <div style="background:var(--color-bg-tertiary);border-radius:8px;padding:16px;margin-bottom:12px">
                    <div :style="{ color: currentSpec.colors.text, fontWeight: 600, marginBottom: '8px' }">客户列表</div>
                    <div :style="{ color: currentSpec.colors.text, opacity: 0.7, fontSize: '13px', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }">上海某某有限公司</div>
                    <div :style="{ color: currentSpec.colors.text, opacity: 0.7, fontSize: '13px', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }">深圳某某科技有限公司</div>
                    <div :style="{ color: currentSpec.colors.text, opacity: 0.7, fontSize: '13px', padding: '8px 0' }">东莞某某贸易公司</div>
                  </div>
                  <div style="background:var(--color-bg-tertiary);border-radius:8px;padding:16px;margin-bottom:12px">
                    <div :style="{ color: currentSpec.colors.text, fontWeight: 600, marginBottom: '8px' }">库存概览</div>
                    <div style="display:flex;gap:8px">
                      <div style="flex:1;text-align:center;padding:8px;background:var(--color-bg-secondary);border-radius:6px">
                        <div :style="{ fontSize: '18px', fontWeight: 700, color: currentSpec.colors.primary }">128</div>
                        <div style="font-size:11px;color:var(--color-text-tertiary)">物料数</div>
                      </div>
                      <div style="flex:1;text-align:center;padding:8px;background:var(--color-bg-secondary);border-radius:6px">
                        <div :style="{ fontSize: '18px', fontWeight: 700, color: currentSpec.colors.warning }">5</div>
                        <div style="font-size:11px;color:var(--color-text-tertiary)">低库存</div>
                      </div>
                    </div>
                  </div>
                  <button :style="{ width: '100%', height: currentSpec.components.buttonHeight, background: currentSpec.colors.primary, color: '#fff', border: 'none', borderRadius: currentSpec.components.borderRadius, fontSize: '14px', cursor: 'pointer' }">新建送货单</button>
                </div>
              </div>
              <div class="phone-nav-bar" :style="{ background: currentSpec.colors.darkMode ? '#1a1a2e' : '#fff' }">
                <div class="phone-nav-item"><span class="phone-nav-icon">[首页]</span><span class="phone-nav-label" :style="{ color: currentSpec.colors.primary }">首页</span></div>
                <div class="phone-nav-item"><span class="phone-nav-icon"><Icon name="package" :size="14" /></span><span class="phone-nav-label" :style="{ color: currentSpec.colors.primary }">产品</span></div>
                <div class="phone-nav-item"><span class="phone-nav-icon"><Icon name="list" :size="14" /></span><span class="phone-nav-label" :style="{ color: currentSpec.colors.primary }">订单</span></div>
                <div class="phone-nav-item"><span class="phone-nav-icon"><Icon name="table" :size="14" /></span><span class="phone-nav-label" :style="{ color: currentSpec.colors.primary }">报表</span></div>
                <div class="phone-nav-item"><span class="phone-nav-icon"><Icon name="checkCircle" :size="14" /></span><span class="phone-nav-label" :style="{ color: currentSpec.colors.primary }">审批</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style="width:320px;flex-shrink:0;position:sticky;top:80px;max-height:calc(100vh - 100px);overflow-y:auto">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="palette" :size="14" /> 设计规格 · {{ currentProposalName }}</span></div>
          <div class="panel-card-body">
            <div style="margin-bottom:var(--space-3)">
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">色彩系统</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <div v-for="(color, key) in currentSpec.colors" :key="key" style="display:flex;align-items:center;gap:6px">
                  <div :style="{ width: '20px', height: '20px', borderRadius: '4px', background: color, border: '1px solid var(--color-border)', flexShrink: 0 }"></div>
                  <div style="font-size:11px">
                    <div style="color:var(--color-text-secondary)">{{ colorLabels[key] || key }}</div>
                    <div style="font-family:monospace;color:var(--color-text-primary)">{{ color }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style="margin-bottom:var(--space-3)">
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">排版规范</div>
              <div v-for="(val, key) in currentSpec.typography" :key="key" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px">
                <span style="color:var(--color-text-secondary)">{{ typoLabels[key] || key }}</span>
                <span style="font-family:monospace;color:var(--color-text-primary)">{{ val.split('/')[0] }} / {{ val.split('/')[1] || '400' }}</span>
              </div>
            </div>
            <div style="margin-bottom:var(--space-3)">
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">间距系统</div>
              <div style="display:flex;gap:4px;align-items:flex-end">
                <div v-for="(val, key) in currentSpec.spacing" :key="key" style="text-align:center;flex:1">
                  <div :style="{ height: Math.max(8, parseInt(val)) + 'px', background: 'var(--color-accent)', borderRadius: '2px', margin: '0 auto 4px', width: Math.max(12, parseInt(val)) + 'px' }"></div>
                  <div style="font-size:10px;color:var(--color-text-secondary)">{{ spaceLabels[key] || key }}</div>
                  <div style="font-size:10px;font-family:monospace;color:var(--color-text-primary)">{{ val }}</div>
                </div>
              </div>
            </div>
            <div style="margin-bottom:var(--space-3)">
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">组件规范</div>
              <div v-for="(val, key) in currentSpec.components" :key="key" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px">
                <span style="color:var(--color-text-secondary)">{{ compLabels[key] || key }}</span>
                <span style="font-family:monospace;color:var(--color-text-primary)">{{ val }}</span>
              </div>
            </div>
            <div>
              <div style="font-weight:600;font-size:13px;margin-bottom:8px">动画参数</div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px">
                <span style="color:var(--color-text-secondary)">持续时间</span>
                <span style="font-family:monospace;color:var(--color-text-primary)">{{ currentSpec.animation.duration }}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px">
                <span style="color:var(--color-text-secondary)">缓动函数</span>
                <span style="font-family:monospace;color:var(--color-text-primary);font-size:10px">{{ currentSpec.animation.easing }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMobileDesignStore } from '@/stores/mobileDesign'

const mdStore = useMobileDesignStore()

const showHelp = ref(false)
const activeProposal = ref(1)
const activeDevice = ref('iphone')
const realtimePreview = ref(false)

const proposals = [
  { id: 1, label: '方案一 · 极简商务' },
  { id: 2, label: '方案二 · 科技活力' },
  { id: 3, label: '方案三 · 温暖企业' },
  { id: 4, label: '方案四 · 暗色高端' },
  { id: 5, label: '方案五 · 清新自然' }
]

const devices = [
  { key: 'iphone', icon: 'mobile', label: 'iPhone', title: 'iPhone 375x812' },
  { key: 'android', icon: 'mobile', label: 'Android', title: 'Android 360x800' },
  { key: 'ipad', icon: 'mobile', label: 'iPad', title: 'iPad 768x1024' }
]

const designSpecs = {
  1: { name: '极简商务', colors: { primary: '#3b82f6', secondary: '#1e293b', accent: '#60a5fa', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', bg: '#f8fafc', text: '#0f172a' }, typography: { heading: '20px/700', body: '14px/400', caption: '12px/400' }, spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }, components: { buttonHeight: '44px', inputHeight: '40px', cardPadding: '16px', borderRadius: '8px' }, animation: { duration: '250ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
  2: { name: '科技活力', colors: { primary: '#7c4dff', secondary: '#0a0a1a', accent: '#00e5ff', success: '#00e676', warning: '#ffd740', danger: '#ff1744', bg: '#0a0a1a', text: '#e0e0e0' }, typography: { heading: '22px/700', body: '14px/400', caption: '11px/400' }, spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }, components: { buttonHeight: '46px', inputHeight: '42px', cardPadding: '14px', borderRadius: '12px' }, animation: { duration: '200ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
  3: { name: '温暖企业', colors: { primary: '#8d6e63', secondary: '#4e342e', accent: '#ffcc80', success: '#66bb6a', warning: '#ffa726', danger: '#ef5350', bg: '#faf6f1', text: '#3e2723' }, typography: { heading: '20px/600', body: '15px/400', caption: '12px/400' }, spacing: { xs: '6px', sm: '10px', md: '18px', lg: '26px', xl: '34px' }, components: { buttonHeight: '44px', inputHeight: '40px', cardPadding: '18px', borderRadius: '10px' }, animation: { duration: '300ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
  4: { name: '暗色高端', colors: { primary: '#d4af37', secondary: '#0d0d0d', accent: '#f5e6a3', success: '#4caf50', warning: '#ff9800', danger: '#f44336', bg: '#0d0d0d', text: '#d4af37' }, typography: { heading: '21px/300', body: '14px/400', caption: '11px/300' }, spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '36px' }, components: { buttonHeight: '48px', inputHeight: '44px', cardPadding: '20px', borderRadius: '6px' }, animation: { duration: '350ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
  5: { name: '清新自然', colors: { primary: '#43a047', secondary: '#1b5e20', accent: '#a5d6a7', success: '#66bb6a', warning: '#ffb74d', danger: '#e57373', bg: '#f1f8e9', text: '#1b5e20' }, typography: { heading: '20px/600', body: '14px/400', caption: '12px/400' }, spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }, components: { buttonHeight: '44px', inputHeight: '40px', cardPadding: '16px', borderRadius: '12px' }, animation: { duration: '250ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } }
}

const colorLabels = { primary: '主色', secondary: '辅色', accent: '强调色', success: '成功', warning: '警告', danger: '危险', bg: '背景', text: '文本' }
const typoLabels = { heading: '标题', body: '正文', caption: '辅助' }
const spaceLabels = { xs: 'XS', sm: 'SM', md: 'MD', lg: 'LG', xl: 'XL' }
const compLabels = { buttonHeight: '按钮高度', inputHeight: '输入框高度', cardPadding: '卡片内距', borderRadius: '圆角' }

const currentSpec = computed(() => designSpecs[activeProposal.value] || designSpecs[1])
const currentProposalName = computed(() => currentSpec.value.name)

const phoneFrameStyle = computed(() => {
  const size = { iphone: { w: 375, h: 812 }, android: { w: 360, h: 800 }, ipad: { w: 768, h: 1024 } }
  const s = size[activeDevice.value] || size.iphone
  const scale = activeDevice.value === 'ipad' ? 0.55 : 1
  return {
    width: (s.w * scale) + 'px',
    height: (s.h * scale) + 'px',
    borderColor: currentSpec.value.colors.secondary
  }
})

const phoneContentStyle = computed(() => ({
  background: currentSpec.value.colors.bg,
  color: currentSpec.value.colors.text
}))

function exportDesignSpec() {
  const spec = {
    proposal: proposals.find(p => p.id === activeProposal.value),
    device: devices.find(d => d.key === activeDevice.value),
    designSpec: currentSpec.value,
    exportTime: new Date().toISOString()
  }
  const data = JSON.stringify(spec, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '设计规格_' + proposals.find(p => p.id === activeProposal.value)?.label + '_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
}

onMounted(() => { mdStore.initSeedData() })
</script>

<style scoped>
.active-device {
  background: var(--color-accent) !important;
  color: #fff !important;
}
.phone-frame {
  width: 280px; height: 500px; border: 2px solid var(--color-border); border-radius: 24px;
  overflow: hidden; display: flex; flex-direction: column; background: #f5f5f5;
}
.phone-status-bar {
  display: flex; justify-content: space-between; padding: 4px 12px;
  font-size: 11px; color: var(--color-text-tertiary); background: var(--color-surface);
}
.phone-content { flex: 1; overflow-y: auto; }
.phone-nav-bar {
  display: flex; justify-content: space-around; padding: 6px 0;
  border-top: 1px solid var(--color-border); background: #fff;
}
.phone-nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.phone-nav-icon { font-size: 16px; }
.phone-nav-label { font-size: 9px; }

/* 响应式适配 */
@media (max-width: 1024px) {
  .page-header-actions {
    flex-wrap: wrap;
  }
  .filter-bar {
    flex-wrap: wrap;
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
  .filter-bar {
    flex-direction: column;
  }
  .phone-frame {
    width: 240px;
    height: 420px;
  }
}
</style>
