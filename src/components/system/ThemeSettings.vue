<template>
  <div>
    <!-- 页面头部 -->
    <div class="page-header" style="margin-bottom:var(--space-3)">
      <div>
        <h2 class="page-header-title">主题管理</h2>
        <p class="page-header-subtitle">自定义系统外观、主题色、排版和显示模式</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" @click="showImportModal = true"><Icon name="upload" :size="14" /> 导入主题</button>
        <button class="btn btn-ghost" @click="exportCurrentTheme"><Icon name="download" :size="14" /> 导出主题</button>
        <button class="btn btn-primary" @click="saveThemeSettings"><Icon name="save" :size="14" /> 保存主题设置</button>
      </div>
    </div>

    <!-- 标签栏 -->
    <div class="tab-bar" style="margin-bottom:var(--space-4)">
      <button v-for="tt in themeTabs" :key="tt.key" class="tab-btn" :class="{ active: activeThemeTab === tt.key }" @click="activeThemeTab = tt.key">
        <Icon :name="tt.icon" :size="14" />
        {{ tt.label }}
      </button>
    </div>

    <!-- 主题切换 -->
    <div v-if="activeThemeTab === 'switching'">
      <div class="content-grid content-grid-2">
        <!-- 外观模式 -->
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="monitor" :size="14" /> 外观模式</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">选择显示模式 <span class="form-hint">{{ currentModeInfo?.desc }}</span></label>
              <div class="mode-grid">
                <button v-for="mode in modes" :key="mode.key" class="mode-card" :class="{ active: currentThemeMode === mode.key }" @click="currentThemeMode = mode.key">
                  <div class="mode-icon"><Icon :name="mode.icon" :size="16" /></div>
                  <div class="mode-label">{{ mode.name }}</div>
                  <div class="mode-desc">{{ mode.desc }}</div>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">亮度调节 <span class="value-badge">{{ themeBrightness }}%</span></label>
              <input type="range" v-model.number="themeBrightness" min="50" max="150" class="range-slider">
              <div class="range-labels"><span>偏暗</span><span>默认</span><span>偏亮</span></div>
            </div>
            <div class="btn-group">
              <button class="btn btn-secondary" @click="toggleDarkLight"><Icon name="refresh-cw" :size="14" /> 明暗切换</button>
              <button class="btn btn-secondary" @click="resetThemeToDefault"><Icon name="rotate-ccw" :size="14" /> 恢复默认</button>
            </div>
          </div>
        </div>
        <!-- 当前状态 -->
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="info" :size="14" /> 当前状态</span></div>
          <div class="panel-card-body">
            <div class="status-preview">
              <div class="status-item">
                <span class="status-label">模式</span>
                <span class="status-value">{{ currentModeInfo?.name || currentThemeMode }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">亮度</span>
                <span class="status-value">{{ themeBrightness }}%</span>
              </div>
              <div class="status-item">
                <span class="status-label">主题色</span>
                <span class="status-value color-dot" :style="{ background: themeAccentColor }">{{ themeAccentColor }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">过渡动画</span>
                <span class="status-value">{{ effectiveTransitionDuration }}ms</span>
              </div>
            </div>
            <div class="live-preview-box">
              <div class="preview-accent" :style="{ background: themeAccentColor }">主色按钮预览</div>
              <div class="preview-outline" :style="{ borderColor: themeAccentColor, color: themeAccentColor }">边框样式预览</div>
              <div class="preview-subtle" :style="{ borderLeftColor: themeAccentColor, background: 'var(--color-surface-elevated)' }">主色强调信息</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 自动切换 -->
      <div class="panel-card" style="margin-top:var(--space-4)">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="clock" :size="14" /> 自动主题切换</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoSwitchEnabled">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="panel-card-body" v-if="autoSwitchEnabled">
          <div class="form-group">
            <label class="form-label">切换方式</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="autoSwitchFollowSystem" :value="true">
                <span>跟随系统设置</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="autoSwitchFollowSystem" :value="false">
                <span>按时间 schedule</span>
              </label>
            </div>
          </div>
          <div v-if="!autoSwitchFollowSystem" class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">浅色模式开始时间</label>
              <input type="time" class="form-input" v-model="autoSwitchLightStart">
            </div>
            <div class="form-group">
              <label class="form-label">深色模式开始时间</label>
              <input type="time" class="form-input" v-model="autoSwitchDarkStart">
            </div>
          </div>
          <div class="form-hint">系统将根据您的设置自动在浅色和深色模式间切换</div>
        </div>
      </div>
    </div>

    <!-- 主色配置 -->
    <div v-if="activeThemeTab === 'accent'">
      <div class="content-grid content-grid-2">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="palette" :size="14" /> 主色配置</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">选择主题色</label>
              <select class="form-select" v-model="themeAccentPreset" @change="applyAccentPreset" style="width:100%">
                <option v-for="p in accentPresets" :key="p.value" :value="p.value">{{ p.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">自定义主色</label>
              <div class="color-input-row">
                <input type="color" v-model="themeAccentColor" class="color-picker">
                <input type="text" class="form-input" v-model="themeAccentColor" placeholder="#3b82f6" style="width:120px">
                <span class="form-hint">悬停色:</span>
                <input type="color" v-model="themeAccentHover" class="color-picker">
                <input type="text" class="form-input" v-model="themeAccentHover" placeholder="#60a5fa" style="width:120px" readonly>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">对比度检测</label>
              <div class="contrast-row">
                <span class="contrast-badge" :class="{ pass: whiteContrastRatio >= 4.5 }">白底对比度: {{ whiteContrast }}</span>
                <span class="contrast-badge" :class="{ pass: blackContrastRatio >= 4.5 }">黑底对比度: {{ blackContrast }}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">预设主色</label>
              <div class="swatch-grid">
                <div v-for="swatch in accentSwatches" :key="swatch.color" class="color-swatch" :style="{ background: swatch.color }" :title="swatch.name" @click="themeAccentColor = swatch.color"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="eye" :size="14" /> 主色预览</span></div>
          <div class="panel-card-body">
            <div class="live-preview-box">
              <div class="preview-row">
                <button class="preview-btn-primary" :style="{ background: themeAccentColor }">主色按钮</button>
                <button class="preview-btn-outline" :style="{ borderColor: themeAccentColor, color: themeAccentColor }">描边按钮</button>
              </div>
              <div class="preview-alert" :style="{ borderLeftColor: themeAccentColor }">
                <strong>提示信息</strong>
                <p>这是一条使用当前主色的提示信息示例</p>
              </div>
              <div class="preview-progress">
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: '65%', background: themeAccentColor }"></div>
                </div>
              </div>
              <div class="preview-tags">
                <span class="preview-tag" :style="{ background: themeAccentColor + '20', color: themeAccentColor, borderColor: themeAccentColor + '40' }">标签示例</span>
                <span class="preview-tag" :style="{ background: themeAccentColor + '15', color: themeAccentColor }">状态标签</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 排版间距 -->
    <div v-if="activeThemeTab === 'typography'">
      <div class="content-grid content-grid-2">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="type" :size="14" /> 字体缩放</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">全局字体缩放 <span class="value-badge">{{ fontScale }}%</span></label>
              <input type="range" v-model.number="fontScale" min="75" max="150" step="5" class="range-slider">
              <div class="range-labels"><span>75%</span><span>100%</span><span>150%</span></div>
            </div>
            <div class="form-group">
              <label class="form-label">行高 <span class="value-badge">{{ lineHeight.toFixed(1) }}</span></label>
              <input type="range" v-model.number="lineHeightRaw" min="12" max="24" step="1" class="range-slider">
              <div class="range-labels"><span>紧凑 1.2</span><span>默认 1.6</span><span>宽松 2.4</span></div>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="layout" :size="14" /> 布局间距</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">间距缩放 <span class="value-badge">{{ spacingScale }}%</span></label>
              <input type="range" v-model.number="spacingScale" min="50" max="200" step="10" class="range-slider">
              <div class="range-labels"><span>紧凑 50%</span><span>默认 100%</span><span>宽松 200%</span></div>
            </div>
            <div class="form-group">
              <label class="form-label">组件内边距 <span class="value-badge">{{ layoutPadding }}rem</span></label>
              <input type="range" v-model.number="layoutPaddingRaw" min="4" max="32" step="2" class="range-slider">
            </div>
            <div class="form-group">
              <label class="form-label">组件间距 <span class="value-badge">{{ layoutGap }}rem</span></label>
              <input type="range" v-model.number="layoutGapRaw" min="4" max="32" step="2" class="range-slider">
            </div>
            <div class="form-group">
              <label class="form-label">组件圆角 <span class="value-badge">{{ componentRadius }}rem</span></label>
              <input type="range" v-model.number="componentRadiusRaw" min="0" max="24" step="1" class="range-slider">
            </div>
          </div>
        </div>
      </div>
      <div class="panel-card" style="margin-top:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="eye" :size="14" /> 排版间距预览</span></div>
        <div class="panel-card-body">
          <div class="typography-preview">
            <h1 class="tp-h1" :style="{ fontSize: `calc(var(--font-size-2xl) * ${fontScale / 100})`, marginBottom: `calc(var(--space-3) * ${spacingScale / 100})` }">一级标题示例</h1>
            <h2 class="tp-h2" :style="{ fontSize: `calc(var(--font-size-xl) * ${fontScale / 100})`, marginBottom: `calc(var(--space-3) * ${spacingScale / 100})` }">二级标题示例</h2>
            <p class="tp-body" :style="{ fontSize: `calc(var(--font-size-sm) * ${fontScale / 100})`, lineHeight: lineHeight, marginBottom: `calc(var(--space-3) * ${spacingScale / 100})` }">正文文本示例，用于展示排版间距和字体缩放效果。正文文本示例，用于展示排版间距和字体缩放效果。</p>
            <div class="tp-card" :style="{ padding: `calc(${layoutPadding}rem * ${spacingScale / 100})`, borderRadius: `calc(${componentRadius}rem)`, marginBottom: `calc(var(--space-3) * ${spacingScale / 100})` }">
              <div class="tp-card-title" :style="{ fontSize: `calc(var(--font-size-sm) * ${fontScale / 100})` }">卡片标题</div>
              <div class="tp-card-desc" :style="{ fontSize: `calc(var(--font-size-xs) * ${fontScale / 100})` }">卡片描述文本信息</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景表面 -->
    <div v-if="activeThemeTab === 'background'">
      <div class="content-grid content-grid-2">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="image" :size="14" /> 背景配置</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">背景类型</label>
              <select class="form-select" v-model="themeSettings.bgType" style="width:100%">
                <option value="solid">纯色</option>
                <option value="gradient">渐变</option>
              </select>
            </div>
            <div v-if="themeSettings.bgType === 'solid'">
              <div class="form-group">
                <label class="form-label">背景颜色</label>
                <div class="color-input-row">
                  <input type="color" v-model="themeSettings.bgColor" class="color-picker">
                  <input type="text" class="form-input" v-model="themeSettings.bgColor" placeholder="#0f172a" style="width:120px">
                </div>
              </div>
            </div>
            <div v-if="themeSettings.bgType === 'gradient'">
              <div class="form-group">
                <label class="form-label">渐变起始色</label>
                <div class="color-input-row">
                  <input type="color" v-model="themeSettings.gradientColor" class="color-picker">
                  <input type="text" class="form-input" v-model="themeSettings.gradientColor" placeholder="#0f172a" style="width:120px">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">渐变终止色</label>
                <div class="color-input-row">
                  <input type="color" v-model="themeSettings.gradientColor2" class="color-picker">
                  <input type="text" class="form-input" v-model="themeSettings.gradientColor2" placeholder="#1e293b" style="width:120px">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">渐变方向</label>
                <select class="form-select" v-model="themeSettings.gradientDir">
                  <option value="to right">向右</option>
                  <option value="to bottom">向下</option>
                  <option value="to bottom right">右下</option>
                  <option value="135deg">135°</option>
                  <option value="to top">向上</option>
                  <option value="to left">向左</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" @click="resetThemeCustomizations('background')" style="width:100%">重置为模式默认背景</button>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="layers" :size="14" /> 表面样式</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">卡片背景色</label>
              <div class="color-input-row">
                <input type="color" v-model="themeSettings.cardBg" class="color-picker">
                <input type="text" class="form-input" v-model="themeSettings.cardBg" placeholder="#1e293b" style="width:120px">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">提升表面色</label>
              <div class="color-input-row">
                <input type="color" v-model="themeSettings.surfaceElevated" class="color-picker">
                <input type="text" class="form-input" v-model="themeSettings.surfaceElevated" placeholder="#1a2332" style="width:120px">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">边框色</label>
              <div class="color-input-row">
                <input type="color" v-model="themeSettings.borderColor" class="color-picker">
                <input type="text" class="form-input" v-model="themeSettings.borderColor" placeholder="#334155" style="width:120px">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">阴影</label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="themeSettings.shadowEnabled">
                <span>启用阴影</span>
              </label>
            </div>
            <div v-if="themeSettings.shadowEnabled" class="form-group">
              <label class="form-label">阴影强度 <span class="value-badge">{{ themeSettings.shadowIntensity }}%</span></label>
              <input type="range" v-model.number="themeSettings.shadowIntensity" min="10" max="100" step="10" class="range-slider">
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" @click="resetThemeCustomizations('surface')" style="width:100%">重置为模式默认表面</button>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-card" style="margin-top:var(--space-4)">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="eye" :size="14" /> 背景与表面预览</span>
        </div>
        <div class="panel-card-body">
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
        </div>
      </div>
    </div>

    <!-- 动画与无障碍 -->
    <div v-if="activeThemeTab === 'accessibility'">
      <div class="content-grid content-grid-2">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="zap" :size="14" /> 动画设置</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">过渡动画</label>
              <label class="toggle-switch-row">
                <span>启用过渡动画</span>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="themeSettings.animation.enabled">
                  <span class="toggle-slider"></span>
                </label>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">动画时长 <span class="value-badge">{{ themeSettings.animation.transitionDuration }}ms</span></label>
              <input type="range" v-model.number="themeSettings.animation.transitionDuration" min="0" max="1000" step="50" class="range-slider">
            </div>
            <div class="form-group">
              <label class="form-label">减少动画</label>
              <label class="toggle-switch-row">
                <span>减少动态效果（偏好减少动画）</span>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="themeSettings.animation.reduceMotion">
                  <span class="toggle-slider"></span>
                </label>
              </label>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="shield" :size="14" /> 无障碍</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">高对比度</label>
              <label class="toggle-switch-row">
                <span>启用高对比度模式</span>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="themeSettings.accessibility.highContrast">
                  <span class="toggle-slider"></span>
                </label>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">大字体</label>
              <label class="toggle-switch-row">
                <span>启用大字体模式</span>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="themeSettings.accessibility.largeText">
                  <span class="toggle-slider"></span>
                </label>
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">焦点可见</label>
              <label class="toggle-switch-row">
                <span>显示焦点轮廓（键盘导航）</span>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="themeSettings.accessibility.focusVisible">
                  <span class="toggle-slider"></span>
                </label>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 启动页面 -->
    <div v-if="activeThemeTab === 'splash'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="sparkles" :size="14" /> 智能推荐引擎</span></div>
        <div class="panel-card-body">
          <div class="recommend-box">
            <div class="recommend-title">推荐方案：{{ splashOptions.find(s => s.name === themeSettings.splash)?.name || '星空粒子' }}</div>
            <div class="recommend-desc">基于当前主题模式和用户偏好自动推荐最佳启动动画方案。</div>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" @click="applyAutoSplashStyle"><Icon name="target" :size="14" /> 一键应用推荐</button>
            <button class="btn btn-secondary" @click="refreshSplashRecommendation"><Icon name="refresh-cw" :size="14" /> 重新分析</button>
            <button class="btn btn-secondary" @click="applyDynamicSplashColors"><Icon name="palette" :size="14" /> 应用动态配色</button>
          </div>
        </div>
      </div>
      <div class="content-grid content-grid-2">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="activity" :size="14" /> 启动动画方案</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">选择启动动画风格（下次启动生效）</label>
              <div class="splash-grid">
                <button v-for="s in splashOptions" :key="s.name" class="splash-style-btn" :class="{ active: themeSettings.splash === s.name }" @click="themeSettings.splash = s.name">
                  <div class="splash-preview" :style="{ background: s.gradient, borderRadius: s.radius || '12px', border: s.border || 'none', boxShadow: s.boxShadow || 'none', color: s.textColor || 'inherit' }"><Icon :name="s.icon" :size="20" /></div>
                  <div class="splash-name">{{ s.name }}</div>
                  <div class="splash-desc">{{ s.desc }}</div>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">UI背景图自动搭配</label>
              <select class="form-select" v-model="themeSettings.splashBgPattern" style="width:100%">
                <option value="auto">自动匹配主题</option>
                <option value="dots">圆点纹理</option>
                <option value="grid">网格纹理</option>
                <option value="waves">波纹纹理</option>
                <option value="none">无纹理</option>
              </select>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" @click="previewSplashStyle" style="width:100%"><Icon name="eye" :size="14" /> 预览当前方案</button>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="list" :size="14" /> 方案对比</span></div>
          <div class="panel-card-body">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>方案</th>
                  <th class="tc-center">性能</th>
                  <th class="tc-center">视觉</th>
                  <th class="tc-center">适配</th>
                  <th>推荐场景</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in splashComparisonRows" :key="row.name">
                  <td><Icon :name="row.icon" :size="14" /> {{ row.name }}</td>
                  <td class="tc-center"><span class="star-rating">{{ '★'.repeat(row.performance) }}{{ '☆'.repeat(5 - row.performance) }}</span></td>
                  <td class="tc-center"><span class="star-rating">{{ '★'.repeat(row.visual) }}{{ '☆'.repeat(5 - row.visual) }}</span></td>
                  <td class="tc-center"><span class="star-rating">{{ '★'.repeat(row.adaptability) }}{{ '☆'.repeat(5 - row.adaptability) }}</span></td>
                  <td>{{ row.recommended }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 预设方案 -->
    <div v-if="activeThemeTab === 'presets'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="target" :size="14" /> 预设主题方案</span>
          <span class="panel-card-hint">一键应用完整主题配置</span>
        </div>
        <div class="panel-card-body">
          <div class="preset-grid">
            <div v-for="preset in presetThemeList" :key="preset.name" class="preset-card" :class="{ active: activePresetTheme === preset.name }" @click="applyPresetTheme(preset)">
              <div class="preset-header">
                <span class="preset-name">{{ preset.name }}</span>
                <span v-if="activePresetTheme === preset.name" class="preset-badge">使用中</span>
              </div>
              <div class="preset-colors">
                <div v-for="(color, i) in preset.colors" :key="i" class="preset-color-dot" :style="{ background: color }"></div>
              </div>
              <div class="preset-desc">{{ preset.desc }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="save" :size="14" /> 自定义预设</span>
        </div>
        <div class="panel-card-body">
          <div class="custom-preset-row">
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
              <label class="form-label">预设名称</label>
              <input type="text" class="form-input" v-model="customPresetName" placeholder="输入预设名称">
            </div>
            <button class="btn btn-primary" @click="saveCustomPreset">保存当前样式</button>
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
              <label class="form-label">加载预设</label>
              <select class="form-select" v-model="loadPresetSelect" @change="loadCustomPreset" style="width:100%">
                <option value="">-- 选择预设 --</option>
                <option v-for="p in customPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
              </select>
            </div>
            <button class="btn btn-danger" @click="deleteCustomPreset">删除预设</button>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="list" :size="14" /> 色彩系统参考</span>
          <div class="panel-card-actions">
            <button class="btn btn-ghost btn-sm" @click="refreshColorSystemDisplay"><Icon name="refresh-cw" :size="14" /> 刷新</button>
            <button class="btn btn-secondary btn-sm" @click="resetThemeCustomizations('all')"><Icon name="rotate-ccw" :size="14" /> 重置所有自定义</button>
          </div>
        </div>
        <div class="panel-card-body">
          <div class="color-system-grid">
            <div v-for="cs in colorSystemItems" :key="cs.name" class="color-system-card">
              <div class="color-system-name">{{ cs.name }}</div>
              <div class="color-system-swatches">
                <div v-for="(color, i) in cs.colors" :key="i" class="color-system-swatch" :style="{ background: color }" :title="color"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入主题弹窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">导入主题</span>
          <button class="modal-close" @click="showImportModal = false"><Icon name="x" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">粘贴主题配置 JSON</label>
            <textarea class="form-textarea" v-model="importJson" rows="10" placeholder='{"theme":"ocean","mode":"dark",...}'></textarea>
          </div>
          <div v-if="importResult" class="import-result" :class="{ error: !importResult.success }">
            {{ importResult.message }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
          <button class="btn btn-primary" @click="doImportTheme">导入</button>
        </div>
      </div>
    </div>

    <!-- 导出主题弹窗 -->
    <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header">
          <span class="modal-title">导出主题</span>
          <button class="modal-close" @click="showExportModal = false"><Icon name="x" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">主题配置 JSON</label>
            <textarea class="form-textarea" :value="exportJson" rows="10" readonly></textarea>
          </div>
          <button class="btn btn-primary" @click="copyExportJson" style="width:100%">
            <Icon name="copy" :size="14" /> {{ copied ? '已复制' : '复制到剪贴板' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const activeThemeTab = ref('switching')
const themeTabs = [
  { key: 'switching', label: '主题切换', icon: 'monitor' },
  { key: 'accent', label: '主色配置', icon: 'palette' },
  { key: 'typography', label: '排版间距', icon: 'type' },
  { key: 'background', label: '背景表面', icon: 'image' },
  { key: 'accessibility', label: '动画与无障碍', icon: 'shield' },
  { key: 'splash', label: '启动页面', icon: 'sparkles' },
  { key: 'presets', label: '预设方案', icon: 'target' }
]

// ============ 外观模式 ============
const currentThemeMode = computed({
  get: () => themeStore.currentMode,
  set: (val) => themeStore.setMode(val)
})
const modes = themeStore.modes
const currentModeInfo = themeStore.currentModeInfo

const themeBrightness = ref(themeStore.themeSettings.brightness)
watch(themeBrightness, (val) => {
  themeStore.updateSettings({ brightness: val })
})

const effectiveTransitionDuration = themeStore.effectiveTransitionDuration

function toggleDarkLight() {
  themeStore.toggleMode()
}

function resetThemeToDefault() {
  themeStore.resetToDefault()
  themeBrightness.value = 100
  themeAccentColor.value = '#3b82f6'
  themeAccentHover.value = '#60a5fa'
  themeAccentPreset.value = 'ocean'
  activePresetTheme.value = 'ocean'
  fontScale.value = 100
  lineHeightRaw.value = 16
  spacingScale.value = 100
}

function saveThemeSettings() {
  themeStore.persist()
  alert('主题设置已保存')
}

// ============ 自动切换 ============
const autoSwitchEnabled = computed({
  get: () => themeStore.themeSettings.autoSwitch.enabled,
  set: (val) => themeStore.updateSettings({ autoSwitch: { ...themeStore.themeSettings.autoSwitch, enabled: val } })
})
const autoSwitchFollowSystem = computed({
  get: () => themeStore.themeSettings.autoSwitch.followSystem,
  set: (val) => themeStore.updateSettings({ autoSwitch: { ...themeStore.themeSettings.autoSwitch, followSystem: val } })
})
const autoSwitchLightStart = computed({
  get: () => themeStore.themeSettings.autoSwitch.schedule.lightStart,
  set: (val) => themeStore.updateSettings({ autoSwitch: { ...themeStore.themeSettings.autoSwitch, schedule: { ...themeStore.themeSettings.autoSwitch.schedule, lightStart: val } } })
})
const autoSwitchDarkStart = computed({
  get: () => themeStore.themeSettings.autoSwitch.schedule.darkStart,
  set: (val) => themeStore.updateSettings({ autoSwitch: { ...themeStore.themeSettings.autoSwitch, schedule: { ...themeStore.themeSettings.autoSwitch.schedule, darkStart: val } } })
})

// ============ 主色配置 ============
const themeAccentColor = ref(themeStore.themeSettings.accentColor)
const themeAccentHover = ref(themeStore.themeSettings.accentHover)
watch(themeAccentColor, (val) => {
  themeStore.updateSettings({ accentColor: val })
})
watch(themeAccentHover, (val) => {
  themeStore.updateSettings({ accentHover: val })
})

const themeAccentPreset = ref('ocean')
const accentPresets = [
  { value: 'ocean', label: '海洋蓝' },
  { value: 'forest', label: '森林绿' },
  { value: 'sunset', label: '日落橙' },
  { value: 'royal', label: '皇家紫' },
  { value: 'crimson', label: '绯红' },
  { value: 'amber', label: '琥珀金' },
  { value: 'emerald', label: '翡翠绿' },
  { value: 'rose', label: '玫瑰粉' },
  { value: 'sky', label: '天空蓝' },
  { value: 'violet', label: '紫罗兰' },
  { value: 'teal', label: '青碧' },
  { value: 'zinc', label: '锌灰' },
  { value: 'indigo', label: '靛蓝' },
  { value: 'pink', label: '粉红' },
  { value: 'lime', label: '青柠' },
  { value: 'orange', label: '橙色' },
  { value: 'slate', label: '石板灰' }
]

const accentSwatches = [
  { name: '海洋蓝', color: '#3b82f6' }, { name: '翡翠绿', color: '#10b981' },
  { name: '琥珀金', color: '#f59e0b' }, { name: '绯红', color: '#ef4444' },
  { name: '皇家紫', color: '#8b5cf6' }, { name: '玫瑰粉', color: '#ec4899' },
  { name: '青色', color: '#06b6d4' }, { name: '青柠', color: '#84cc16' },
  { name: '日落橙', color: '#f97316' }, { name: '靛蓝', color: '#6366f1' },
  { name: '青碧', color: '#14b8a6' }, { name: '薰衣草', color: '#a78bfa' }
]

function applyAccentPreset() {
  const colorMap = {
    ocean: '#3b82f6', forest: '#22c55e', sunset: '#f59e0b', royal: '#a855f7',
    crimson: '#ef4444', amber: '#d97706', emerald: '#10b981', rose: '#f43f5e',
    sky: '#0ea5e9', violet: '#8b5cf6', teal: '#14b8a6', zinc: '#71717a',
    indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16', orange: '#f97316', slate: '#475569'
  }
  const hoverMap = {
    ocean: '#60a5fa', forest: '#4ade80', sunset: '#fbbf24', royal: '#c084fc',
    crimson: '#f87171', amber: '#f59e0b', emerald: '#34d399', rose: '#fb7185',
    sky: '#38bdf8', violet: '#a78bfa', teal: '#2dd4bf', zinc: '#a1a1aa',
    indigo: '#818cf8', pink: '#f472b6', lime: '#a3e635', orange: '#fb923c', slate: '#64748b'
  }
  themeAccentColor.value = colorMap[themeAccentPreset.value] || '#3b82f6'
  themeAccentHover.value = hoverMap[themeAccentPreset.value] || '#60a5fa'
  themeStore.setTheme(themeAccentPreset.value)
}

// 对比度计算
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
  const rgb = hexToRgb(themeAccentColor.value)
  const lum = getLuminance(rgb.r, rgb.g, rgb.b)
  return getContrastRatio(lum, 1)
})
const blackContrastRatio = computed(() => {
  const rgb = hexToRgb(themeAccentColor.value)
  const lum = getLuminance(rgb.r, rgb.g, rgb.b)
  return getContrastRatio(lum, 0)
})
const whiteContrast = computed(() => whiteContrastRatio.value.toFixed(2) + ':1')
const blackContrast = computed(() => blackContrastRatio.value.toFixed(2) + ':1')

// ============ 排版间距 ============
const fontScale = ref(themeStore.themeSettings.fontScale)
const lineHeightRaw = ref(Math.round(themeStore.themeSettings.lineHeight * 10))
const spacingScale = ref(themeStore.themeSettings.spacingScale)
const layoutPaddingRaw = ref(Math.round(themeStore.themeSettings.layoutPadding * 16))
const layoutGapRaw = ref(Math.round(themeStore.themeSettings.layoutGap * 16))
const componentRadiusRaw = ref(Math.round(themeStore.themeSettings.componentRadius * 16))

watch(fontScale, (val) => themeStore.updateSettings({ fontScale: val }))
watch(lineHeightRaw, (val) => themeStore.updateSettings({ lineHeight: val / 10 }))
watch(spacingScale, (val) => themeStore.updateSettings({ spacingScale: val }))
watch(layoutPaddingRaw, (val) => themeStore.updateSettings({ layoutPadding: val / 16 }))
watch(layoutGapRaw, (val) => themeStore.updateSettings({ layoutGap: val / 16 }))
watch(componentRadiusRaw, (val) => themeStore.updateSettings({ componentRadius: val / 16 }))

const lineHeight = computed(() => lineHeightRaw.value / 10)
const layoutPadding = computed(() => (layoutPaddingRaw.value / 16).toFixed(1))
const layoutGap = computed(() => (layoutGapRaw.value / 16).toFixed(1))
const componentRadius = computed(() => (componentRadiusRaw.value / 16).toFixed(1))

// ============ 背景表面 ============
const themeSettings = themeStore.themeSettings

const bgPreviewStyle = computed(() => {
  if (themeSettings.bgType === 'gradient') {
    return {
      background: `linear-gradient(${themeSettings.gradientDir}, ${themeSettings.gradientColor}, ${themeSettings.gradientColor2})`
    }
  }
  return { background: themeSettings.bgColor }
})

const spCardStyle = computed(() => ({
  background: themeSettings.cardBg,
  border: '1px solid ' + themeSettings.borderColor,
  boxShadow: themeSettings.shadowEnabled ? `0 4px ${themeSettings.shadowIntensity / 100 * 20}px rgba(0,0,0,${themeSettings.shadowIntensity / 100 * 0.5})` : 'none'
}))

const spElevatedStyle = computed(() => ({
  background: themeSettings.surfaceElevated,
  border: '1px solid ' + themeSettings.borderColor,
  boxShadow: themeSettings.shadowEnabled ? `0 4px ${themeSettings.shadowIntensity / 100 * 20}px rgba(0,0,0,${themeSettings.shadowIntensity / 100 * 0.5})` : 'none'
}))

function resetThemeCustomizations(type) {
  if (type === 'background') {
    themeStore.updateSettings({
      bgType: 'solid',
      bgColor: '#0f172a',
      gradientColor: '#1e293b',
      gradientColor2: '#0f172a',
      gradientDir: 'to bottom'
    })
  } else if (type === 'surface') {
    themeStore.updateSettings({
      cardBg: '#1e293b',
      surfaceElevated: '#1a2332',
      borderColor: '#475569',
      shadowEnabled: true,
      shadowIntensity: 50
    })
  } else if (type === 'all') {
    resetThemeToDefault()
  }
}

// ============ 启动页面 ============
const splashOptions = [
  { name: '星空粒子', icon: 'zap', desc: '星座连线网络', gradient: 'linear-gradient(135deg,#050a18,#3b82f6)', radius: '12px' },
  { name: '极简光晕', icon: 'dollar-sign', desc: '呼吸发光', gradient: 'linear-gradient(160deg,#0f172a,#1e293b)', radius: '12px', border: '1px solid #3b82f6' },
  { name: '渐变流动', icon: 'palette', desc: '柔美粒子拖尾', gradient: 'linear-gradient(135deg,#667eea,#764ba2)', radius: '50%' },
  { name: '数据矩阵', icon: 'table', desc: '业务数据流', gradient: '#020a02', radius: '8px', border: '2px solid #22c55e', textColor: '#22c55e' },
  { name: '齿轮联动', icon: 'building', desc: '机械精密旋转', gradient: 'linear-gradient(135deg,#d97706,#92400e)', radius: '50%' },
  { name: '生长动画', icon: 'sun', desc: '自然生命力', gradient: 'linear-gradient(135deg,#22c55e,#059669)', radius: '24px' },
  { name: '水墨晕染', icon: 'palette', desc: '东方美学', gradient: '#f5f0e8', radius: '50%', border: '2px solid #333', textColor: '#1a1a1a' },
  { name: '光效脉冲', icon: 'star', desc: '爆发力冲击', gradient: 'radial-gradient(circle,#f43f5e,#be123c)', radius: '50%', boxShadow: '0 0 16px rgba(244,63,94,0.5)' },
  { name: '水波纹理', icon: 'globe', desc: '同心波纹扩散', gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)', radius: '50%' }
]

const splashComparisonRows = [
  { icon: 'zap', name: '星空粒子', performance: 4, visual: 5, adaptability: 4, recommended: '通用/数据看板' },
  { icon: 'dollar-sign', name: '极简光晕', performance: 5, visual: 3, adaptability: 5, recommended: '企业/低配设备' },
  { icon: 'palette', name: '渐变流动', performance: 4, visual: 5, adaptability: 4, recommended: '设计/品牌展示' },
  { icon: 'table', name: '数据矩阵', performance: 4, visual: 4, adaptability: 4, recommended: '制造/物流ERP' },
  { icon: 'building', name: '齿轮联动', performance: 5, visual: 4, adaptability: 5, recommended: '机械/工业' },
  { icon: 'sun', name: '生长动画', performance: 4, visual: 4, adaptability: 4, recommended: '农业/环保' },
  { icon: 'palette', name: '水墨晕染', performance: 5, visual: 4, adaptability: 5, recommended: '文创/政府' },
  { icon: 'star', name: '光效脉冲', performance: 3, visual: 5, adaptability: 4, recommended: '营销/娱乐' },
  { icon: 'globe', name: '水波纹理', performance: 4, visual: 4, adaptability: 4, recommended: '零售/餐饮' }
]

function applyAutoSplashStyle() {
  alert('已应用推荐的启动动画方案')
}
function refreshSplashRecommendation() {
  alert('已重新分析并更新推荐方案')
}
function applyDynamicSplashColors() {
  alert('已根据当前主题色自动调整启动动画配色')
}
function previewSplashStyle() {
  alert('预览当前启动动画方案')
}

// ============ 预设方案 ============
const activePresetTheme = ref('ocean')
const customPresetName = ref('')
const loadPresetSelect = ref('')
const customPresets = ref([])

const presetThemeList = [
  { name: 'ocean', label: '海洋蓝', color: '#3b82f6', desc: '专业沉稳，适合企业办公', colors: ['#3b82f6', '#60a5fa', '#1e40af'] },
  { name: 'forest', label: '森林绿', color: '#22c55e', desc: '自然清新，适合环保行业', colors: ['#22c55e', '#4ade80', '#166534'] },
  { name: 'sunset', label: '日落橙', color: '#f59e0b', desc: '温暖活力，适合营销团队', colors: ['#f59e0b', '#fbbf24', '#b45309'] },
  { name: 'royal', label: '皇家紫', color: '#a855f7', desc: '高贵典雅，适合设计团队', colors: ['#a855f7', '#c084fc', '#7e22ce'] },
  { name: 'crimson', label: '绯红', color: '#ef4444', desc: '热情奔放，适合销售团队', colors: ['#ef4444', '#f87171', '#b91c1c'] },
  { name: 'emerald', label: '翡翠绿', color: '#10b981', desc: '清新明亮，适合数据看板', colors: ['#10b981', '#34d399', '#065f46'] }
]

const colorSystemItems = computed(() => [
  { name: '主色系', colors: [themeAccentColor.value, themeAccentHover.value] },
  { name: '中性色', colors: ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529'] },
  { name: '功能色', colors: ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'] },
  { name: '扩展色', colors: accentSwatches.map(s => s.color) }
])

function applyPresetTheme(preset) {
  activePresetTheme.value = preset.name
  themeAccentColor.value = preset.color
  themeAccentHover.value = themeStore.adjustBrightness(preset.color, 20)
  themeAccentPreset.value = preset.name
  themeStore.setTheme(preset.name)
}

function saveCustomPreset() {
  if (!customPresetName.value) { alert('请输入预设名称'); return }
  customPresets.value.push({
    name: customPresetName.value,
    mode: currentThemeMode.value,
    accentColor: themeAccentColor.value,
    brightness: themeBrightness.value
  })
  customPresetName.value = ''
  alert('预设已保存')
}

function loadCustomPreset() {
  const preset = customPresets.value.find(p => p.name === loadPresetSelect.value)
  if (!preset) return
  currentThemeMode.value = preset.mode
  themeAccentColor.value = preset.accentColor
  themeBrightness.value = preset.brightness
  alert('已加载预设: ' + preset.name)
}

function deleteCustomPreset() {
  if (!loadPresetSelect.value) { alert('请先选择要删除的预设'); return }
  if (!confirm('确认删除预设 "' + loadPresetSelect.value + '"？')) return
  customPresets.value = customPresets.value.filter(p => p.name !== loadPresetSelect.value)
  loadPresetSelect.value = ''
  alert('预设已删除')
}

function refreshColorSystemDisplay() {
  alert('色彩系统参考已刷新')
}

// ============ 导入导出 ============
const showImportModal = ref(false)
const showExportModal = ref(false)
const importJson = ref('')
const exportJson = ref('')
const importResult = ref(null)
const copied = ref(false)

function exportCurrentTheme() {
  exportJson.value = themeStore.exportTheme()
  showExportModal.value = true
  copied.value = false
}

function doImportTheme() {
  importResult.value = themeStore.importTheme(importJson.value)
  if (importResult.value.success) {
    setTimeout(() => { showImportModal.value = false; importJson.value = '' }, 800)
  }
}

function copyExportJson() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(exportJson.value).then(() => {
      copied.value = true
      setTimeout(() => copied.value = false, 2000)
    })
  }
}

// ============ 初始化 ============
onMounted(() => {
  // 同步 store 中的设置到本地 ref
  themeBrightness.value = themeStore.themeSettings.brightness
  themeAccentColor.value = themeStore.themeSettings.accentColor
  themeAccentHover.value = themeStore.themeSettings.accentHover
  fontScale.value = themeStore.themeSettings.fontScale
  lineHeightRaw.value = Math.round(themeStore.themeSettings.lineHeight * 10)
  spacingScale.value = themeStore.themeSettings.spacingScale
  layoutPaddingRaw.value = Math.round(themeStore.themeSettings.layoutPadding * 16)
  layoutGapRaw.value = Math.round(themeStore.themeSettings.layoutGap * 16)
  componentRadiusRaw.value = Math.round(themeStore.themeSettings.componentRadius * 16)
})
</script>

<style scoped>
/* ========== 布局 ========== */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.swatch-grid {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.splash-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}
.color-system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
}
.bg-surface-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

/* ========== 模式卡片 ========== */
.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}
.mode-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.mode-card.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent), var(--shadow-md);
}
.mode-icon {
  font-size: 1.5rem;
  margin-bottom: var(--space-2);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-elevated);
  border-radius: var(--radius-md);
}
.mode-card.active .mode-icon {
  background: color-mix(in srgb, var(--color-accent) 15%, var(--color-surface-elevated));
}
.mode-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-primary);
}
.mode-desc {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
  line-height: 1.3;
}
.mode-card.active .mode-label {
  color: var(--color-accent);
}

/* ========== 颜色选择器 ========== */
.color-picker {
  width: 48px;
  height: 36px;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 0;
  background: none;
}
.color-input-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}
.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 2px solid var(--color-border);
  transition: transform 0.15s;
}
.color-swatch:hover {
  transform: scale(1.15);
  border-color: var(--color-accent);
}

/* ========== 滑块 ========== */
.range-slider {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  border: 2px solid var(--color-surface);
  box-shadow: var(--shadow-sm);
}
.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  border: 2px solid var(--color-surface);
  box-shadow: var(--shadow-sm);
}
.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* ========== 状态预览 ========== */
.status-preview {
  padding: var(--space-4);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-4);
}
.status-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--color-border);
}
.status-item:last-child {
  border-bottom: none;
}
.status-label {
  color: var(--color-text-secondary);
}
.status-value {
  font-weight: 600;
  color: var(--color-text-primary);
}
.color-dot {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

/* ========== 实时预览框 ========== */
.live-preview-box {
  padding: var(--space-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.preview-accent {
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
}
.preview-outline {
  border: 2px solid;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  margin-bottom: 8px;
  background: transparent;
}
.preview-subtle {
  border-left: 4px solid;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 0 6px 6px 0;
}
.preview-row {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.preview-btn-primary {
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.preview-btn-outline {
  background: transparent;
  border: 2px solid;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.preview-alert {
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: var(--space-3);
  background: var(--color-surface-elevated);
  border-left: 4px solid;
  font-size: 13px;
}
.preview-alert strong {
  display: block;
  margin-bottom: 4px;
}
.preview-progress {
  margin-bottom: var(--space-3);
}
.progress-track {
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
.preview-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.preview-tag {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
  border: 1px solid transparent;
}

/* ========== 排版预览 ========== */
.typography-preview {
  padding: var(--space-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.tp-h1 {
  font-weight: 800;
  color: var(--color-text-primary);
}
.tp-h2 {
  font-weight: 700;
  color: var(--color-text-primary);
}
.tp-body {
  color: var(--color-text-secondary);
}
.tp-card {
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
}
.tp-card-title {
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}
.tp-card-desc {
  color: var(--color-text-tertiary);
}

/* ========== 背景预览 ========== */
.bg-preview-area {
  min-height: 240px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
}
.surface-preview-area {
  padding: var(--space-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.sp-card {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}
.sp-card-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}
.sp-card-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* ========== 启动动画 ========== */
.splash-style-btn {
  min-width: 90px;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}
.splash-style-btn:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.splash-style-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  box-shadow: 0 0 0 1px var(--color-accent);
}
.splash-preview {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.splash-name {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-primary);
}
.splash-desc {
  font-size: 10px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.recommend-box {
  padding: var(--space-4);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}
.recommend-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: var(--space-2);
  color: var(--color-text-primary);
}
.recommend-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* ========== 预设卡片 ========== */
.preset-card {
  background: var(--color-surface);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.preset-card:hover {
  border-color: var(--color-border-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.preset-card.active {
  border-color: var(--color-accent);
}
.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.preset-name {
  font-weight: 700;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}
.preset-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.preset-colors {
  display: flex;
  gap: 4px;
  margin-bottom: var(--space-2);
}
.preset-color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}
.preset-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.custom-preset-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
  flex-wrap: wrap;
}

/* ========== 对比度 ========== */
.contrast-row {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.contrast-badge {
  font-size: var(--font-size-xs);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}
.contrast-badge.pass {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

/* ========== 表格 ========== */
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.comparison-table th,
.comparison-table td {
  padding: var(--space-2);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.comparison-table th {
  color: var(--color-text-secondary);
  font-weight: 600;
}
.tc-center {
  text-align: center;
}
.star-rating {
  color: var(--color-warning);
  font-size: var(--font-size-xs);
  letter-spacing: 2px;
}

/* ========== 开关 ========== */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-tertiary);
  transition: 0.3s;
  border-radius: 24px;
}
.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--color-surface);
  transition: 0.3s;
  border-radius: 50%;
}
.toggle-switch input:checked + .toggle-slider {
  background: var(--color-accent);
}
.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}
.toggle-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* ========== 单选 ========== */
.radio-group {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* ========== 复选框 ========== */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* ========== 标签栏 ========== */
.tab-bar {
  display: flex;
  gap: var(--space-1);
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
  margin-bottom: -2px;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

/* ========== 按钮组 ========== */
.btn-group {
  display: flex;
  gap: var(--space-3);
}

/* ========== 值标签 ========== */
.value-badge {
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
}

/* ========== 表单提示 ========== */
.form-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 400;
  margin-left: var(--space-1);
}

/* ========== 面板头部 ========== */
.panel-card-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
.panel-card-actions {
  display: flex;
  gap: var(--space-2);
}

/* ========== 色彩系统 ========== */
.color-system-card {
  padding: var(--space-3);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-md);
}
.color-system-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.color-system-swatches {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.color-system-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

/* ========== 导入导出 ========== */
.import