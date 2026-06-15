<template>
  <div class="tr-section">
    <div v-for="group in section.groups" :key="group.title" class="tr-group">
      <div class="panel-card" :class="{ 'tr-group--no-header-toggle': !group.headerToggle }">
        <div class="panel-card-header">
          <span class="panel-card-title">
            <Icon :name="group.icon || 'circle'" :size="14" />
            {{ group.title }}
          </span>
          <div class="panel-card-actions" v-if="group.headerActions">
            <button v-for="a in group.headerActions" :key="a.action" class="btn btn-ghost btn-sm" @click="emitAction(a.action)">
              <Icon :name="a.icon" :size="14" /> {{ a.label }}
            </button>
          </div>
          <label v-if="group.headerToggle" class="toggle-switch">
            <input type="checkbox" :checked="getValue(group.headerToggle.key)" @change="setValue(group.headerToggle.key, $event.target.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="panel-card-body">
          <template v-for="(field, idx) in visibleFields(group.fields)" :key="field.key || field.type + idx">

            <!-- modeGrid -->
            <template v-if="field.type === 'modeGrid'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <div class="mode-grid">
                  <button v-for="mode in themeModes" :key="mode.key" class="mode-card" :class="{ active: store.currentMode === mode.key }" @click="store.setMode(mode.key)">
                    <div class="mode-icon"><Icon :name="mode.icon" :size="16" /></div>
                    <div class="mode-label">{{ mode.name }}</div>
                    <div class="mode-desc">{{ mode.desc }}</div>
                  </button>
                </div>
              </div>
            </template>

            <!-- range -->
            <template v-else-if="field.type === 'range'">
              <div class="form-group">
                <label class="form-label">{{ field.label }} <span class="value-badge">{{ formatRangeValue(getValue(field.key), field) }}</span></label>
                <input type="range" :value="getValue(field.key)" :min="field.min" :max="field.max" :step="field.step || 1" class="range-slider" @input="setValue(field.key, parseFloat($event.target.value))">
                <div v-if="field.minLabel || field.maxLabel" class="range-labels">
                  <span>{{ field.minLabel || field.min }}</span>
                  <span>{{ field.maxLabel || field.max }}</span>
                </div>
              </div>
            </template>

            <!-- color -->
            <template v-else-if="field.type === 'color'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <div class="color-input-row">
                  <input type="color" :value="getValue(field.key)" class="color-picker" :disabled="field.readOnly" @input="setValue(field.key, $event.target.value)">
                  <input type="text" class="form-input" :value="getValue(field.key)" :readonly="field.readOnly" style="width:120px" @change="setValue(field.key, $event.target.value)">
                </div>
              </div>
            </template>

            <!-- select -->
            <template v-else-if="field.type === 'select'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <select class="form-select" :value="getValue(field.key)" style="width:100%" @change="handleSelectChange(field, $event.target.value)">
                  <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </template>

            <!-- toggle -->
            <template v-else-if="field.type === 'toggle'">
              <div class="form-group">
                <label class="toggle-switch-row">
                  <span>{{ field.label }}</span>
                  <label class="toggle-switch">
                    <input type="checkbox" :checked="getValue(field.key)" @change="setValue(field.key, $event.target.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </label>
              </div>
            </template>

            <!-- radio -->
            <template v-else-if="field.type === 'radio'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <div class="radio-group">
                  <label v-for="opt in field.options" :key="String(opt.value)" class="radio-label">
                    <input type="radio" :name="field.key" :value="opt.value" :checked="getValue(field.key) === opt.value" @change="setValue(field.key, opt.value)">
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </div>
            </template>

            <!-- time -->
            <template v-else-if="field.type === 'time'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <input type="time" class="form-input" :value="getValue(field.key)" @change="setValue(field.key, $event.target.value)">
              </div>
            </template>

            <!-- textarea -->
            <template v-else-if="field.type === 'textarea'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <textarea class="form-textarea" :value="getValue(field.key)" rows="10" :placeholder="field.placeholder" @input="setValue(field.key, $event.target.value)"></textarea>
              </div>
            </template>

            <!-- buttonGroup -->
            <template v-else-if="field.type === 'buttonGroup'">
              <div class="form-group">
                <div class="btn-group">
                  <button v-for="btn in field.actions" :key="btn.action" class="btn btn-secondary" @click="emitAction(btn.action)">
                    <Icon :name="btn.icon" :size="14" /> {{ btn.label }}
                  </button>
                </div>
              </div>
            </template>

            <!-- infoBox -->
            <template v-else-if="field.type === 'infoBox'">
              <div class="form-hint" style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-3)">
                {{ field.content }}
              </div>
            </template>

            <!-- statusPreview -->
            <template v-else-if="field.type === 'statusPreview'">
              <div class="status-preview">
                <div v-for="item in field.items" :key="item.key" class="status-item">
                  <span class="status-label">{{ item.label }}</span>
                  <span class="status-value" :class="{ 'color-dot': item.format === 'colorDot' }" :style="item.format === 'colorDot' ? { background: getStatusValue(item.key) } : {}" v-html="getStatusValue(item.key) + (item.suffix || '')"></span>
                </div>
              </div>
            </template>

            <!-- livePreview -->
            <template v-else-if="field.type === 'livePreview'">
              <div class="live-preview-box">
                <div class="preview-accent" :style="{ background: settings.accentColor }">主色按钮预览</div>
                <div class="preview-outline" :style="{ borderColor: settings.accentColor, color: settings.accentColor }">边框样式预览</div>
                <div class="preview-subtle" :style="{ borderLeftColor: settings.accentColor, background: 'var(--color-surface-elevated)' }">主色强调信息</div>
              </div>
            </template>

            <!-- contrastDisplay -->
            <template v-else-if="field.type === 'contrastDisplay'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <div class="contrast-row">
                  <span class="contrast-badge" :class="{ pass: whiteContrastRatio >= 4.5 }">白底对比度: {{ whiteContrast }}</span>
                  <span class="contrast-badge" :class="{ pass: blackContrastRatio >= 4.5 }">黑底对比度: {{ blackContrast }}</span>
                </div>
              </div>
            </template>

            <!-- colorSwatches -->
            <template v-else-if="field.type === 'colorSwatches'">
              <div class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <div class="swatch-grid">
                  <div v-for="s in field.swatches" :key="s.color" class="color-swatch" :style="{ background: s.color }" :title="s.name" @click="setValue(field.targetKey, s.color)"></div>
                </div>
              </div>
            </template>

            <!-- accentPreview -->
            <template v-else-if="field.type === 'accentPreview'">
              <div class="live-preview-box">
                <div class="preview-row">
                  <button class="preview-btn-primary" :style="{ background: settings.accentColor }">主色按钮</button>
                  <button class="preview-btn-outline" :style="{ borderColor: settings.accentColor, color: settings.accentColor }">描边按钮</button>
                </div>
                <div class="preview-alert" :style="{ borderLeftColor: settings.accentColor }">
                  <strong>提示信息</strong>
                  <p>这是一条使用当前主色的提示信息示例</p>
                </div>
                <div class="preview-progress">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: '65%', background: settings.accentColor }"></div>
                  </div>
                </div>
                <div class="preview-tags">
                  <span class="preview-tag" :style="{ background: settings.accentColor + '20', color: settings.accentColor, borderColor: settings.accentColor + '40' }">标签示例</span>
                  <span class="preview-tag" :style="{ background: settings.accentColor + '15', color: settings.accentColor }">状态标签</span>
                </div>
              </div>
            </template>

            <!-- typographyPreview -->
            <template v-else-if="field.type === 'typographyPreview'">
              <div class="typography-preview">
                <h1 class="tp-h1" :style="{ fontSize: `calc(var(--font-size-2xl) * ${settings.fontScale / 100})`, marginBottom: `calc(var(--space-3) * ${settings.spacingScale / 100})` }">一级标题示例</h1>
                <h2 class="tp-h2" :style="{ fontSize: `calc(var(--font-size-xl) * ${settings.fontScale / 100})`, marginBottom: `calc(var(--space-3) * ${settings.spacingScale / 100})` }">二级标题示例</h2>
                <p class="tp-body" :style="{ fontSize: `calc(var(--font-size-sm) * ${settings.fontScale / 100})`, lineHeight: settings.lineHeight, marginBottom: `calc(var(--space-3) * ${settings.spacingScale / 100})` }">正文文本示例，用于展示排版间距和字体缩放效果。正文文本示例，用于展示排版间距和字体缩放效果。</p>
                <div class="tp-card" :style="{ padding: `calc(${settings.layoutPadding}rem * ${settings.spacingScale / 100})`, borderRadius: `calc(${settings.componentRadius}rem)`, marginBottom: `calc(var(--space-3) * ${settings.spacingScale / 100})` }">
                  <div class="tp-card-title" :style="{ fontSize: `calc(var(--font-size-sm) * ${settings.fontScale / 100})` }">卡片标题</div>
                  <div class="tp-card-desc" :style="{ fontSize: `calc(var(--font-size-xs) * ${settings.fontScale / 100})` }">卡片描述文本信息</div>
                </div>
              </div>
            </template>

            <!-- bgSurfacePreview -->
            <template v-else-if="field.type === 'bgSurfacePreview'">
              <div class="bg-surface-preview">
                <div class="bg-preview-area" :style="bgPreviewStyle"></div>
                <div class="surface-preview-area">
                  <div class="sp-card" :style="spCardStyle">
                    <div class="sp-card-title">卡片标题示例</div>
                    <div class="sp-card-desc">卡片描述文本信息</div>
                  </div>
                  <div class="sp-card" :style="spElevatedStyle">
                    <div class="sp-card-title">提升表面示例</div>
                    <div class="sp-card-desc">提升表面描述文本</div>
                  </div>
                </div>
              </div>
            </template>

            <!-- splashGrid -->
            <template v-else-if="field.type === 'splashGrid'">
              <div class="form-group">
                <label class="form-label">选择启动动画风格（下次启动生效）</label>
                <div class="splash-grid">
                  <button v-for="s in field.options" :key="s.name" class="splash-style-btn" :class="{ active: settings.splash === s.name }" @click="setValue(field.key, s.name)">
                    <div class="splash-preview" :style="{ background: s.gradient, borderRadius: s.radius || '12px', border: s.border || 'none', boxShadow: s.boxShadow || 'none', color: s.textColor || 'inherit' }"><Icon :name="s.icon" :size="20" /></div>
                    <div class="splash-name">{{ s.name }}</div>
                    <div class="splash-desc">{{ s.desc }}</div>
                  </button>
                </div>
              </div>
            </template>

            <!-- presetGrid -->
            <template v-else-if="field.type === 'presetGrid'">
              <div class="preset-grid">
                <div v-for="preset in field.options" :key="preset.name" class="preset-card" :class="{ active: store.currentTheme === preset.name }" @click="store.setTheme(preset.name)">
                  <div class="preset-header">
                    <span class="preset-name">{{ preset.label }}</span>
                    <span v-if="store.currentTheme === preset.name" class="preset-badge">使用中</span>
                  </div>
                  <div class="preset-colors">
                    <div v-for="(color, i) in preset.colors" :key="i" class="preset-color-dot" :style="{ background: color }"></div>
                  </div>
                  <div class="preset-desc">{{ preset.desc }}</div>
                </div>
              </div>
            </template>

            <!-- comparisonTable -->
            <template v-else-if="field.type === 'comparisonTable'">
              <div class="table-container">
                <table class="comparison-table">
                  <thead>
                    <tr>
                      <th v-for="col in field.columns" :key="col.key" :class="{ 'tc-center': col.format === 'stars' }">{{ col.label }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in field.rows" :key="row.name">
                      <td v-for="col in field.columns" :key="col.key" :class="{ 'tc-center': col.format === 'stars' }">
                        <span v-if="col.icon"><Icon :name="row.icon" :size="14" /> </span>
                        <span v-if="col.format === 'stars'" class="star-rating">{{ '★'.repeat(row[col.key]) }}{{ '☆'.repeat(5 - row[col.key]) }}</span>
                        <span v-else>{{ row[col.key] }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <!-- colorSystem -->
            <template v-else-if="field.type === 'colorSystem'">
              <div class="color-system-grid">
                <div class="color-system-card">
                  <div class="color-system-name">主色系</div>
                  <div class="color-system-swatches">
                    <div class="color-system-swatch" :style="{ background: settings.accentColor }"></div>
                    <div class="color-system-swatch" :style="{ background: settings.accentHover }"></div>
                  </div>
                </div>
                <div class="color-system-card">
                  <div class="color-system-name">中性色</div>
                  <div class="color-system-swatches">
                    <div v-for="c in ['#f8f9fa','#e9ecef','#dee2e6','#ced4da','#adb5bd','#6c757d','#495057','#343a40','#212529']" :key="c" class="color-system-swatch" :style="{ background: c }"></div>
                  </div>
                </div>
                <div class="color-system-card">
                  <div class="color-system-name">功能色</div>
                  <div class="color-system-swatches">
                    <div v-for="c in ['#22c55e','#f59e0b','#ef4444','#3b82f6']" :key="c" class="color-system-swatch" :style="{ background: c }"></div>
                  </div>
                </div>
                <div class="color-system-card">
                  <div class="color-system-name">扩展色</div>
                  <div class="color-system-swatches">
                    <div v-for="s in accentSwatches.slice(0, 8)" :key="s.color" class="color-system-swatch" :style="{ background: s.color }"></div>
                  </div>
                </div>
              </div>
            </template>

            <!-- customPreset -->
            <template v-else-if="field.type === 'customPreset'">
              <div class="custom-preset-row">
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
                  <label class="form-label">预设名称</label>
                  <input type="text" class="form-input" v-model="customPresetName" placeholder="输入预设名称">
                </div>
                <button class="btn btn-primary" @click="saveCustomPreset">保存当前样式</button>
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
                  <label class="form-label">加载预设</label>
                  <select class="form-select" v-model="loadPresetSelect" style="width:100%">
                    <option value="">-- 选择预设 --</option>
                    <option v-for="p in customPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
                  </select>
                </div>
                <button class="btn btn-secondary" @click="loadCustomPreset">加载</button>
                <button class="btn btn-danger" @click="deleteCustomPreset">删除</button>
              </div>
            </template>

          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { themeModes, accentSwatches } from '../../config/themeSchema'

const props = defineProps({
  section: { type: Object, required: true },
  settings: { type: Object, required: true },
  store: { type: Object, required: true }
})

const emit = defineEmits(['action'])

const customPresetName = ref('')
const loadPresetSelect = ref('')
const customPresets = ref([])

// ========== Path helpers ==========
function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function setByPath(obj, path, value) {
  const keys = path.split('.')
  const last = keys.pop()
  const target = keys.reduce((o, k) => o[k], obj)
  target[last] = value
}

function getValue(key) {
  if (!key) return undefined
  return getByPath(props.settings, key)
}

function setValue(key, value) {
  if (!key) return
  const clone = JSON.parse(JSON.stringify(props.settings))
  setByPath(clone, key, value)
  props.store.updateSettings(clone)
}

function visibleFields(fields) {
  return (fields || []).filter(f => {
    if (!f.condition) return true
    return getValue(f.condition.key) === f.condition.value
  })
}

function emitAction(action) {
  emit('action', action)
}

function handleSelectChange(field, value) {
  setValue(field.key, value)
  if (field.action) {
    emit('action', field.action)
  }
}

function formatRangeValue(val, field) {
  if (field.format === 'decimal') return parseFloat(val).toFixed(1)
  if (field.format === 'rem') return parseFloat(val).toFixed(2) + 'rem'
  return val + (field.unit || '')
}

function getStatusValue(key) {
  if (key === 'modeName') return props.store.currentModeInfo?.name || props.store.currentMode
  if (key === 'transitionDuration') return props.store.effectiveTransitionDuration
  return getValue(key)
}

// ========== Contrast ==========
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}
function getContrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

const whiteContrastRatio = computed(() => {
  const rgb = hexToRgb(props.settings.accentColor)
  return getContrastRatio(getLuminance(rgb.r, rgb.g, rgb.b), 1)
})
const blackContrastRatio = computed(() => {
  const rgb = hexToRgb(props.settings.accentColor)
  return getContrastRatio(getLuminance(rgb.r, rgb.g, rgb.b), 0)
})
const whiteContrast = computed(() => whiteContrastRatio.value.toFixed(2) + ':1')
const blackContrast = computed(() => blackContrastRatio.value.toFixed(2) + ':1')

// ========== Preview styles ==========
const bgPreviewStyle = computed(() => {
  const s = props.settings
  if (s.bgType === 'gradient') {
    return { background: `linear-gradient(${s.gradientDir}, ${s.gradientColor}, ${s.gradientColor2})` }
  }
  return { background: s.bgColor }
})

const spCardStyle = computed(() => ({
  background: props.settings.cardBg,
  border: '1px solid ' + props.settings.borderColor,
  boxShadow: props.settings.shadowEnabled ? `0 4px ${props.settings.shadowIntensity / 100 * 20}px rgba(0,0,0,${props.settings.shadowIntensity / 100 * 0.5})` : 'none'
}))

const spElevatedStyle = computed(() => ({
  background: props.settings.surfaceElevated,
  border: '1px solid ' + props.settings.borderColor,
  boxShadow: props.settings.shadowEnabled ? `0 4px ${props.settings.shadowIntensity / 100 * 20}px rgba(0,0,0,${props.settings.shadowIntensity / 100 * 0.5})` : 'none'
}))

// ========== Custom preset actions ==========
function saveCustomPreset() {
  if (!customPresetName.value) { alert('请输入预设名称'); return }
  customPresets.value.push({
    name: customPresetName.value,
    mode: props.store.currentMode,
    accentColor: props.settings.accentColor,
    brightness: props.settings.brightness
  })
  customPresetName.value = ''
  alert('预设已保存')
}

function loadCustomPreset() {
  const preset = customPresets.value.find(p => p.name === loadPresetSelect.value)
  if (!preset) { alert('请先选择预设'); return }
  props.store.setMode(preset.mode)
  props.store.updateSettings({ accentColor: preset.accentColor, brightness: preset.brightness })
  alert('已加载预设: ' + preset.name)
}

function deleteCustomPreset() {
  if (!loadPresetSelect.value) { alert('请先选择要删除的预设'); return }
  if (!confirm('确认删除预设 "' + loadPresetSelect.value + '"？')) return
  customPresets.value = customPresets.value.filter(p => p.name !== loadPresetSelect.value)
  loadPresetSelect.value = ''
  alert('预设已删除')
}
</script>

<style scoped>
/* Layout */
.tr-section { display: flex; flex-direction: column; gap: var(--space-4); }
.tr-group .panel-card { margin-bottom: 0; }

/* Mode grid */
.mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.mode-card { display: flex; flex-direction: column; align-items: center; padding: var(--space-3); background: var(--color-surface); border: 2px solid var(--color-border); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-fast); text-align: center; }
.mode-card:hover { border-color: var(--color-accent); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.mode-card.active { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent), var(--shadow-md); }
.mode-icon { font-size: 1.5rem; margin-bottom: var(--space-2); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--color-surface-elevated); border-radius: var(--radius-md); }
.mode-card.active .mode-icon { background: color-mix(in srgb, var(--color-accent) 15%, var(--color-surface-elevated)); }
.mode-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-primary); }
.mode-desc { font-size: 10px; color: var(--color-text-tertiary); margin-top: var(--space-1); line-height: 1.3; }
.mode-card.active .mode-label { color: var(--color-accent); }

/* Color picker */
.color-picker { width: 48px; height: 36px; border: none; cursor: pointer; border-radius: var(--radius-sm); padding: 0; background: none; }
.color-input-row { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
.swatch-grid { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.color-swatch { width: 32px; height: 32px; border-radius: var(--radius-sm); cursor: pointer; border: 2px solid var(--color-border); transition: transform 0.15s; }
.color-swatch:hover { transform: scale(1.15); border-color: var(--color-accent); }

/* Range slider */
.range-slider { width: 100%; height: 6px; border-radius: var(--radius-full); background: var(--color-bg-tertiary); outline: none; -webkit-appearance: none; appearance: none; }
.range-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--color-accent); cursor: pointer; border: 2px solid var(--color-surface); box-shadow: var(--shadow-sm); }
.range-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--color-accent); cursor: pointer; border: 2px solid var(--color-surface); box-shadow: var(--shadow-sm); }
.range-labels { display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1); }

/* Status preview */
.status-preview { padding: var(--space-4); background: var(--color-surface-elevated); border-radius: var(--radius-md); font-size: var(--font-size-sm); margin-bottom: var(--space-4); }
.status-item { display: flex; justify-content: space-between; padding: var(--space-1) 0; border-bottom: 1px solid var(--color-border); }
.status-item:last-child { border-bottom: none; }
.status-label { color: var(--color-text-secondary); }
.status-value { font-weight: 600; color: var(--color-text-primary); }
.color-dot { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--font-size-xs); }

/* Live preview */
.live-preview-box { padding: var(--space-4); background: var(--color-bg-primary); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.preview-accent { color: #fff; padding: var(--space-2) var(--space-3); border-radius: 6px; margin-bottom: var(--space-2); font-size: 14px; font-weight: 500; }
.preview-outline { border: 2px solid; border-radius: 6px; padding: var(--space-2) var(--space-3); font-size: 13px; margin-bottom: var(--space-2); background: transparent; }
.preview-subtle { border-left: 4px solid; padding: var(--space-2) var(--space-3); font-size: 13px; border-radius: 0 6px 6px 0; }
.preview-row { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); flex-wrap: wrap; }
.preview-btn-primary { color: #fff; border: none; padding: var(--space-2) var(--space-4); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
.preview-btn-outline { background: transparent; border: 2px solid; padding: var(--space-2) var(--space-4); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
.preview-alert { padding: var(--space-2) var(--space-3); border-radius: 6px; margin-bottom: var(--space-3); background: var(--color-surface-elevated); border-left: 4px solid; font-size: 13px; }
.preview-alert strong { display: block; margin-bottom: var(--space-1); }
.preview-progress { margin-bottom: var(--space-3); }
.progress-track { height: 8px; background: var(--color-bg-tertiary); border-radius: var(--radius-full); overflow: hidden; }
.progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.3s ease; }
.preview-tags { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.preview-tag { padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 500; border: 1px solid transparent; }

/* Typography preview */
.typography-preview { padding: var(--space-4); background: var(--color-bg-primary); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.tp-h1 { font-weight: 800; color: var(--color-text-primary); }
.tp-h2 { font-weight: 700; color: var(--color-text-primary); }
.tp-body { color: var(--color-text-secondary); }
.tp-card { background: var(--color-surface-elevated); border: 1px solid var(--color-border); }
.tp-card-title { font-weight: 700; color: var(--color-text-primary); margin-bottom: var(--space-1); }
.tp-card-desc { color: var(--color-text-tertiary); }

/* Background & surface preview */
.bg-surface-preview { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.bg-preview-area { min-height: 240px; border-radius: var(--radius-md); border: 1px solid var(--color-border); position: relative; overflow: hidden; }
.surface-preview-area { padding: var(--space-4); background: var(--color-bg-primary); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.sp-card { padding: var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-3); }
.sp-card-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-primary); }
.sp-card-desc { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-1); }

/* Splash grid */
.splash-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.splash-style-btn { min-width: 90px; padding: var(--space-3); background: var(--color-surface); border: 2px solid transparent; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease; text-align: center; }
.splash-style-btn:hover { border-color: var(--color-accent); transform: translateY(-2px); }
.splash-style-btn.active { border-color: var(--color-accent); background: var(--color-accent-subtle); box-shadow: 0 0 0 1px var(--color-accent); }
.splash-preview { width: 48px; height: 48px; margin: 0 auto var(--space-2); display: flex; align-items: center; justify-content: center; font-size: 20px; }
.splash-name { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-primary); }
.splash-desc { font-size: 10px; color: var(--color-text-secondary); margin-top: var(--space-1); }

/* Preset grid */
.preset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); }
.preset-card { background: var(--color-surface); border: 2px solid transparent; border-radius: var(--radius-lg); padding: var(--space-3); cursor: pointer; transition: all var(--transition-fast); }
.preset-card:hover { border-color: var(--color-border-light); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.preset-card.active { border-color: var(--color-accent); }
.preset-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); }
.preset-name { font-weight: 700; font-size: var(--font-size-sm); color: var(--color-text-primary); }
.preset-badge { display: inline-block; padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; background: var(--color-success-subtle); color: var(--color-success); }
.preset-colors { display: flex; gap: var(--space-1); margin-bottom: var(--space-2); }
.preset-color-dot { width: 20px; height: 20px; border-radius: 50%; }
.preset-desc { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.custom-preset-row { display: flex; gap: var(--space-3); align-items: flex-end; flex-wrap: wrap; }

/* Contrast */
.contrast-row { display: flex; gap: var(--space-4); flex-wrap: wrap; }
.contrast-badge { font-size: var(--font-size-xs); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.contrast-badge.pass { background: var(--color-success-subtle); color: var(--color-success); }

/* Comparison table */
.comparison-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.comparison-table th { padding: var(--space-2); text-align: left; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); font-weight: 600; overflow-wrap: break-word; word-wrap: break-word; }
.comparison-table td { padding: var(--space-2); text-align: left; border-bottom: 1px solid var(--color-border); overflow-wrap: break-word; word-wrap: break-word; }
.tc-center { text-align: center; }
.star-rating { color: var(--color-warning); font-size: var(--font-size-xs); letter-spacing: 2px; }

/* Toggle switch */
.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: var(--color-bg-tertiary); transition: 0.3s; border-radius: 24px; }
.toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: var(--color-surface); transition: 0.3s; border-radius: 50%; }
.toggle-switch input:checked + .toggle-slider { background: var(--color-accent); }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }
.toggle-switch-row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; font-size: var(--font-size-sm); color: var(--color-text-primary); }

/* Radio group */
.radio-group { display: flex; gap: var(--space-4); flex-wrap: wrap; }
.radio-label { display: flex; align-items: center; gap: var(--space-2); cursor: pointer; font-size: var(--font-size-sm); color: var(--color-text-primary); }

/* Button group */
.btn-group { display: flex; gap: var(--space-3); flex-wrap: wrap; }

/* Value badge */
.value-badge { font-size: var(--font-size-xs); color: var(--color-accent); background: var(--color-accent-subtle); padding: var(--space-1) var(--space-2); border-radius: var(--radius-full); font-weight: 600; }

/* Color system */
.color-system-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3); }
.color-system-card { padding: var(--space-3); background: var(--color-surface-elevated); border-radius: var(--radius-md); }
.color-system-name { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2); }
.color-system-swatches { display: flex; gap: var(--space-1); flex-wrap: wrap; }
.color-system-swatch { width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--color-border); }

/* Misc */
.form-hint { font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-weight: 400; margin-left: var(--space-1); }
.panel-card-actions { display: flex; gap: var(--space-2); }
</style>
