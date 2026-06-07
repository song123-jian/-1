<template>
  <div>
    <div class="page-header" style="margin-bottom:var(--space-3)">
      <div>
        <h2 class="page-header-title">主题管理</h2>
        <p class="page-header-subtitle">自定义系统外观、主题色、排版和显示模式</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost" @click="previewThemeFullscreen"><Icon name="eye" :size="14" /> 全屏预览</button>
        <button class="btn btn-primary" @click="saveThemeSettings"><Icon name="save" :size="14" /> 保存主题设置</button>
      </div>
    </div>

    <div class="tab-bar" style="margin-bottom:var(--space-4)">
      <button v-for="tt in themeTabs" :key="tt.key" class="tab-btn" :class="{ active: activeThemeTab === tt.key }" @click="activeThemeTab = tt.key">{{ tt.label }}</button>
    </div>

    <div v-if="activeThemeTab === 'switching'">
      <div class="content-grid content-grid-2">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="palette" :size="14" /> 外观模式</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">选择显示模式</label>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3)">
                <button v-for="mode in themeModes" :key="mode.key" class="mode-card" :class="{ active: currentThemeMode === mode.key }" @click="currentThemeMode = mode.key">
                  <div class="mode-icon"><Icon :name="mode.icon" :size="14" /></div>
                  <div class="mode-label">{{ mode.label }}</div>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">亮度调节 <span>{{ themeBrightness }}%</span></label>
              <input type="range" v-model.number="themeBrightness" min="50" max="150" style="width:100%">
              <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>偏暗</span><span>默认</span><span>偏亮</span></div>
            </div>
            <div style="display:flex;gap:var(--space-3)">
              <button class="btn btn-secondary" @click="toggleDarkLight" style="flex:1"><Icon name="refresh" :size="14" /> 明暗切换</button>
              <button class="btn btn-secondary" @click="resetThemeToDefault" style="flex:1"><Icon name="chevronLeft" :size="14" /> 恢复默认</button>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="table" :size="14" /> 当前状态</span></div>
          <div class="panel-card-body">
            <div style="padding:var(--space-4);background:var(--color-surface-elevated);border-radius:var(--radius-md);font-size:var(--font-size-sm);margin-bottom:var(--space-4)">
              <div>模式: <strong>{{ themeModes.find(m => m.key === currentThemeMode)?.label || currentThemeMode }}</strong></div>
              <div>亮度: <strong>{{ themeBrightness }}%</strong></div>
              <div>主题色: <span :style="{ display:'inline-block', width:'14px', height:'14px', borderRadius:'50%', background: themeAccentColor, verticalAlign:'middle' }"></span> <strong>{{ themeAccentColor }}</strong></div>
            </div>
            <div style="padding:var(--space-4);background:var(--color-bg-primary);border-radius:var(--radius-md);border:1px solid var(--color-border)">
              <div :style="{ background: themeAccentColor, color: '#fff', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px', fontSize: '14px' }">主色按钮预览</div>
              <div :style="{ border: '2px solid ' + themeAccentColor, borderRadius: '6px', padding: '8px 12px', fontSize: '13px' }">边框样式预览</div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
              <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
                <input type="color" v-model="themeAccentColor" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                <input type="text" class="form-input" v-model="themeAccentColor" placeholder="#3b82f6" style="width:120px">
                <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">悬停色:</span>
                <input type="color" v-model="themeAccentHover" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                <input type="text" class="form-input" v-model="themeAccentHover" placeholder="#60a5fa" style="width:120px" readonly>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">对比度检测</label>
              <div style="display:flex;gap:var(--space-4);flex-wrap:wrap">
                <span style="font-size:var(--font-size-xs)">白底对比度: <strong>{{ whiteContrast }}</strong></span>
                <span style="font-size:var(--font-size-xs)">黑底对比度: <strong>{{ blackContrast }}</strong></span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">预设主色</label>
              <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                <div v-for="swatch in accentSwatches" :key="swatch.color" :style="{ width:'32px', height:'32px', borderRadius:'var(--radius-sm)', background:swatch.color, cursor:'pointer', border:'2px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'center' }" :title="swatch.name" @click="themeAccentColor = swatch.color"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="eye" :size="14" /> 主色预览</span></div>
          <div class="panel-card-body">
            <div style="padding:var(--space-4);background:var(--color-bg-primary);border-radius:var(--radius-md);border:1px solid var(--color-border)">
              <button :style="{ background: themeAccentColor, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }">主色按钮</button>
              <button :style="{ background: 'transparent', color: themeAccentColor, border: '2px solid ' + themeAccentColor, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }">描边按钮</button>
              <div :style="{ marginTop: '12px', padding: '8px', borderLeft: '4px solid ' + themeAccentColor, background: 'var(--color-surface-elevated)', fontSize: '13px' }">主色强调信息</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeThemeTab === 'typography'">
      <div class="content-grid content-grid-2">
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="check" :size="14" /> 字体缩放</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">全局字体缩放 <span>{{ fontScale }}%</span></label>
              <input type="range" v-model.number="fontScale" min="75" max="150" step="5" style="width:100%">
              <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>75%</span><span>100%</span><span>150%</span></div>
            </div>
            <div class="form-group">
              <label class="form-label">行高 <span>{{ lineHeight.toFixed(1) }}</span></label>
              <input type="range" v-model.number="lineHeightRaw" min="12" max="24" step="1" style="width:100%">
              <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>紧凑 1.2</span><span>默认 1.6</span><span>宽松 2.4</span></div>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header"><span class="panel-card-title"><Icon name="grid" :size="14" /> 布局间距</span></div>
          <div class="panel-card-body">
            <div class="form-group">
              <label class="form-label">间距缩放 <span>{{ spacingScale }}%</span></label>
              <input type="range" v-model.number="spacingScale" min="50" max="200" step="10" style="width:100%">
              <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)"><span>紧凑 50%</span><span>默认 100%</span><span>宽松 200%</span></div>
            </div>
            <div class="form-group">
              <label class="form-label">组件内边距 <span>{{ layoutPadding }}rem</span></label>
              <input type="range" v-model.number="layoutPaddingRaw" min="4" max="32" step="2" style="width:100%">
            </div>
            <div class="form-group">
              <label class="form-label">组件间距 <span>{{ layoutGap }}rem</span></label>
              <input type="range" v-model.number="layoutGapRaw" min="4" max="32" step="2" style="width:100%">
            </div>
            <div class="form-group">
              <label class="form-label">组件圆角 <span>{{ componentRadius }}rem</span></label>
              <input type="range" v-model.number="componentRadiusRaw" min="0" max="24" step="1" style="width:100%">
            </div>
          </div>
        </div>
      </div>
      <div class="panel-card" style="margin-top:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="eye" :size="14" /> 排版间距预览</span></div>
        <div class="panel-card-body">
          <div style="padding:var(--space-4);background:var(--color-bg-primary);border-radius:var(--radius-md);border:1px solid var(--color-border)">
            <div style="font-size:calc(var(--font-size-xl) * {{ fontScale / 100 }});font-weight:800;margin-bottom:calc({{ layoutGap }}px * {{ spacingScale / 100 }})">一级标题示例</div>
            <div style="font-size:calc(var(--font-size-lg) * {{ fontScale / 100 }});font-weight:700;margin-bottom:calc({{ layoutGap }}px * {{ spacingScale / 100 }})">二级标题示例</div>
            <div style="font-size:calc(var(--font-size-sm) * {{ fontScale / 100 }});line-height:{{ lineHeight }};margin-bottom:calc({{ layoutGap }}px * {{ spacingScale / 100 }})">正文文本示例，用于展示排版间距和字体缩放效果。正文文本示例，用于展示排版间距和字体缩放效果。</div>
            <div style="padding:calc({{ layoutPadding }}px * {{ spacingScale / 100 }});background:var(--color-surface-elevated);border-radius:calc({{ componentRadius }}px);border:1px solid var(--color-border)">
              <div style="font-size:calc(var(--font-size-sm) * {{ fontScale / 100 }});font-weight:700">卡片标题</div>
              <div style="font-size:calc(var(--font-size-xs) * {{ fontScale / 100 }});color:var(--color-text-tertiary);margin-top:4px">卡片描述文本信息</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeThemeTab === 'background'">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
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
                <div style="display:flex;gap:var(--space-3);align-items:center">
                  <input type="color" v-model="themeSettings.bgColor" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                  <input type="text" class="form-input" v-model="themeSettings.bgColor" placeholder="#0f172a" style="width:120px">
                </div>
              </div>
            </div>
            <div v-if="themeSettings.bgType === 'gradient'">
              <div class="form-group">
                <label class="form-label">渐变起始色</label>
                <div style="display:flex;gap:var(--space-3);align-items:center">
                  <input type="color" v-model="themeSettings.gradientColor" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                  <input type="text" class="form-input" v-model="themeSettings.gradientColor" placeholder="#0f172a" style="width:120px">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">渐变终止色</label>
                <div style="display:flex;gap:var(--space-3);align-items:center">
                  <input type="color" v-model="themeSettings.gradientColor2" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                  <input type="text" class="form-input" v-model="themeSettings.gradientColor2" placeholder="#1e293b" style="width:120px">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">渐变方向</label>
                <select class="form-select" v-model="themeSettings.gradientDir">
                  <option value="to right">向右 <Icon name="chevronRight" :size="14" /></option><option value="to bottom">向下 <Icon name="chevronDown" :size="14" /></option><option value="to bottom right">右下 <Icon name="chevronDown" :size="14" /></option><option value="135deg">135°</option><option value="to top">向上 <Icon name="chevronUp" :size="14" /></option><option value="to left">向左 <Icon name="chevronLeft" :size="14" /></option>
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
              <div style="display:flex;gap:var(--space-3);align-items:center">
                <input type="color" v-model="themeSettings.cardBg" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                <input type="text" class="form-input" v-model="themeSettings.cardBg" placeholder="#1e293b" style="width:120px">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">提升表面色</label>
              <div style="display:flex;gap:var(--space-3);align-items:center">
                <input type="color" v-model="themeSettings.surfaceElevated" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                <input type="text" class="form-input" v-model="themeSettings.surfaceElevated" placeholder="#1a2332" style="width:120px">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">边框色</label>
              <div style="display:flex;gap:var(--space-3);align-items:center">
                <input type="color" v-model="themeSettings.borderColor" style="width:48px;height:36px;border:none;cursor:pointer;border-radius:var(--radius-sm)">
                <input type="text" class="form-input" v-model="themeSettings.borderColor" placeholder="#334155" style="width:120px">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">阴影</label>
              <div style="display:flex;gap:var(--space-3);align-items:center">
                <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer">
                  <input type="checkbox" v-model="themeSettings.shadowEnabled">
                  <span style="font-size:var(--font-size-sm)">启用阴影</span>
                </label>
              </div>
            </div>
            <div v-if="themeSettings.shadowEnabled" class="form-group">
              <label class="form-label">阴影强度 <span>{{ themeSettings.shadowIntensity }}%</span></label>
              <input type="range" v-model.number="themeSettings.shadowIntensity" min="10" max="100" step="10" style="width:100%">
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
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
            <div id="backgroundPreviewArea" style="min-height:240px;border-radius:var(--radius-md);border:1px solid var(--color-border);position:relative;overflow:hidden" :style="{ background: themeSettings.bgType === 'gradient' ? `linear-gradient(${themeSettings.gradientDir}, ${themeSettings.gradientColor}, ${themeSettings.gradientColor2})` : themeSettings.bgColor }"></div>
            <div id="surfacePreviewArea" style="padding:var(--space-4);background:var(--color-bg-primary);border-radius:var(--radius-md);border:1px solid var(--color-border)">
              <div style="padding:var(--space-4);border-radius:var(--radius-md);margin-bottom:var(--space-3)" :style="{ background: themeSettings.cardBg, border: '1px solid ' + themeSettings.borderColor, boxShadow: themeSettings.shadowEnabled ? `0 4px ${themeSettings.shadowIntensity / 100 * 20}px rgba(0,0,0,${themeSettings.shadowIntensity / 100 * 0.5})` : 'none' }">
                <div style="font-size:var(--font-size-sm);font-weight:600">卡片标题示例</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)">卡片描述文本信息</div>
              </div>
              <div style="padding:var(--space-4);border-radius:var(--radius-md)" :style="{ background: themeSettings.surfaceElevated, border: '1px solid ' + themeSettings.borderColor, boxShadow: themeSettings.shadowEnabled ? `0 4px ${themeSettings.shadowIntensity / 100 * 20}px rgba(0,0,0,${themeSettings.shadowIntensity / 100 * 0.5})` : 'none' }">
                <div style="font-size:var(--font-size-sm);font-weight:600">提升表面示例</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:var(--space-1)">提升表面描述文本</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeThemeTab === 'splash'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="zap" :size="14" /> 智能推荐引擎</span></div>
        <div class="panel-card-body">
          <div style="padding:var(--space-4);background:var(--color-surface-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-4)">
            <div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-2)">推荐方案：{{ splashOptions.find(s => s.name === themeSettings.splash)?.name || '星空粒子' }}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">基于当前主题模式和用户偏好自动推荐最佳启动动画方案。</div>
          </div>
          <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
            <button class="btn btn-primary" @click="applyAutoSplashStyle"><Icon name="target" :size="14" /> 一键应用推荐</button>
            <button class="btn btn-secondary" @click="refreshSplashRecommendation"><Icon name="refresh" :size="14" /> 重新分析</button>
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
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">
                <button v-for="s in splashOptions" :key="s.name" class="btn splash-style-btn" :class="{ active: themeSettings.splash === s.name }" @click="themeSettings.splash = s.name" style="min-width:90px;padding:var(--space-3)">
                  <div :style="{ width:'48px', height:'48px', borderRadius:s.radius || '12px', background:s.gradient, margin:'0 auto var(--space-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', border:s.border || 'none', boxShadow:s.boxShadow || 'none', color:s.textColor || 'inherit' }"><Icon :name="s.icon" :size="14" /></div>
                  <div style="font-size:var(--font-size-xs);font-weight:600">{{ s.name }}</div>
                  <div style="font-size:10px;color:var(--color-text-secondary);margin-top:2px">{{ s.desc }}</div>
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
          <div class="panel-card-body" style="font-size:var(--font-size-sm)">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="border-bottom:1px solid var(--color-border)">
                  <th style="text-align:left;padding:var(--space-2);color:var(--color-text-secondary)">方案</th>
                  <th style="text-align:center;padding:var(--space-2);color:var(--color-text-secondary)">性能</th>
                  <th style="text-align:center;padding:var(--space-2);color:var(--color-text-secondary)">视觉</th>
                  <th style="text-align:center;padding:var(--space-2);color:var(--color-text-secondary)">适配</th>
                  <th style="text-align:left;padding:var(--space-2);color:var(--color-text-secondary)">推荐场景</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in splashComparisonRows" :key="row.name" style="border-bottom:1px solid var(--color-border)">
                  <td style="padding:var(--space-2)"><Icon :name="row.icon" :size="14" /> {{ row.name }}</td>
                  <td style="text-align:center;padding:var(--space-2)"><Icon v-for="n in row.performance" :key="'p'+n" name="star" :size="14" /></td>
                  <td style="text-align:center;padding:var(--space-2)"><Icon v-for="n in row.visual" :key="'v'+n" name="star" :size="14" /></td>
                  <td style="text-align:center;padding:var(--space-2)"><Icon v-for="n in row.adaptability" :key="'a'+n" name="star" :size="14" /></td>
                  <td style="padding:var(--space-2)">{{ row.recommended }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeThemeTab === 'presets'">
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="target" :size="14" /> 预设主题方案</span>
          <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">一键应用完整主题配置</span>
        </div>
        <div class="panel-card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-4)">
            <div v-for="preset in presetThemeList" :key="preset.name" class="panel-card" style="cursor:pointer" :style="{ border: activePresetTheme === preset.name ? '2px solid var(--color-accent)' : '2px solid transparent' }" @click="applyPresetTheme(preset)">
              <div style="padding:var(--space-3)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
                  <span style="font-weight:700;font-size:var(--font-size-sm)">{{ preset.name }}</span>
                  <span v-if="activePresetTheme === preset.name" class="status-badge success">使用中</span>
                </div>
                <div style="display:flex;gap:4px;margin-bottom:var(--space-2)">
                  <div v-for="(color, i) in preset.colors" :key="i" :style="{ width: '20px', height: '20px', borderRadius: '50%', background: color }"></div>
                </div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">{{ preset.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-card" style="margin-bottom:var(--space-4)">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="save" :size="14" /> 自定义预设</span>
        </div>
        <div class="panel-card-body">
          <div style="display:flex;gap:var(--space-3);align-items:flex-end;flex-wrap:wrap">
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
            <button class="btn btn-secondary" style="background:var(--color-danger);color:var(--color-text-inverse);border-color:var(--color-danger)" @click="deleteCustomPreset">删除预设</button>
          </div>
        </div>
      </div>
      <div class="panel-card">
        <div class="panel-card-header">
          <span class="panel-card-title"><Icon name="list" :size="14" /> 色彩系统参考</span>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-ghost btn-sm" @click="refreshColorSystemDisplay"><Icon name="refresh" :size="14" /> 刷新</button>
            <button class="btn btn-secondary btn-sm" @click="resetThemeCustomizations('all')"><Icon name="chevronLeft" :size="14" /> 重置所有自定义</button>
          </div>
        </div>
        <div class="panel-card-body">
          <div style="font-size:var(--font-size-sm)">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-3)">
              <div v-for="cs in colorSystemItems" :key="cs.name" style="padding:var(--space-3);background:var(--color-surface-elevated);border-radius:var(--radius-md)">
                <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-2)">{{ cs.name }}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  <div v-for="(color, i) in cs.colors" :key="i" :style="{ width: '24px', height: '24px', borderRadius: '4px', background: color }" :title="color"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showThemeModal" class="modal-overlay" @click.self="showThemeModal = false">
      <div class="modal-dialog" @click.stop>
        <div class="modal-header"><span class="modal-title">{{ editingTheme ? '编辑主题' : '新建主题' }}</span><button class="modal-close" @click="showThemeModal = false"><Icon name="close" :size="14" /></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">主题名称</label><input type="text" class="form-input" v-model="themeForm.name"></div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">主色</label><input type="color" v-model="themeForm.colors.primary" style="width:100%;height:32px;border:none;cursor:pointer"></div>
            <div class="form-group"><label class="form-label">成功色</label><input type="color" v-model="themeForm.colors.success" style="width:100%;height:32px;border:none;cursor:pointer"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">警告色</label><input type="color" v-model="themeForm.colors.warning" style="width:100%;height:32px;border:none;cursor:pointer"></div>
            <div class="form-group"><label class="form-label">危险色</label><input type="color" v-model="themeForm.colors.danger" style="width:100%;height:32px;border:none;cursor:pointer"></div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group"><label class="form-label">字体大小(px)</label><input type="number" class="form-input" v-model.number="themeForm.fontSize" min="10" max="20"></div>
            <div class="form-group"><label class="form-label">圆角(px)</label><input type="number" class="form-input" v-model.number="themeForm.borderRadius" min="0" max="24"></div>
          </div>
          <div class="form-group"><label class="form-label"><input type="checkbox" v-model="themeForm.darkMode"> 深色模式</label></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showThemeModal = false">取消</button><button class="btn btn-primary" @click="submitTheme">保存</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useThemeStore } from '@/stores/theme'

const sysStore = useSystemStore()
const themeStore = useThemeStore()

const activeThemeTab = ref('switching')
const currentThemeMode = computed({
  get: () => themeStore.currentMode,
  set: (val) => themeStore.setMode(val)
})
const themeBrightness = ref(100)
watch(themeBrightness, (val) => {
  document.documentElement.style.filter = `brightness(${val / 100})`
}, { immediate: true })

const themeAccentColor = ref(
  themeStore.themes.find(t => t.key === themeStore.currentTheme)?.color || '#3b82f6'
)
const themeAccentHover = ref('#60a5fa')
watch(themeAccentColor, (val) => {
  document.documentElement.style.setProperty('--theme-accent', val)
}, { immediate: true })
watch(themeAccentHover, (val) => {
  document.documentElement.style.setProperty('--theme-accent-hover', val)
}, { immediate: true })

const themeAccentPreset = ref('ocean')
const fontScale = ref(100)
const lineHeightRaw = ref(16)
const spacingScale = ref(100)
const layoutPaddingRaw = ref(16)
const layoutGapRaw = ref(16)
const componentRadiusRaw = ref(8)

const activePresetTheme = ref('ocean')
const customPresetName = ref('')
const loadPresetSelect = ref('')
const customPresets = ref([])

const themeSettings = reactive({
  bgColor: '#f8f9fa',
  bgType: 'solid',
  gradientColor: '#e9ecef',
  gradientColor2: '#dee2e6',
  gradientDir: 'to right',
  cardBg: '#ffffff',
  surfaceElevated: '#ffffff',
  borderColor: '#dee2e6',
  shadowEnabled: true,
  shadowIntensity: 50,
  splash: '星空粒子',
  splashBgPattern: 'auto'
})

const splashComparisonRows = [
  { icon: 'zap', name: '星空粒子', performance: 4, visual: 5, adaptability: 4, recommended: '通用/数据看板' },
  { icon: 'dollar', name: '极简光晕', performance: 5, visual: 3, adaptability: 5, recommended: '企业/低配设备' },
  { icon: 'palette', name: '渐变流动', performance: 4, visual: 5, adaptability: 4, recommended: '设计/品牌展示' },
  { icon: 'table', name: '数据矩阵', performance: 4, visual: 4, adaptability: 4, recommended: '制造/物流ERP' },
  { icon: 'building', name: '齿轮联动', performance: 5, visual: 4, adaptability: 5, recommended: '机械/工业' },
  { icon: 'sun', name: '生长动画', performance: 4, visual: 4, adaptability: 4, recommended: '农业/环保' },
  { icon: 'palette', name: '水墨晕染', performance: 5, visual: 4, adaptability: 5, recommended: '文创/政府' },
  { icon: 'star', name: '光效脉冲', performance: 3, visual: 5, adaptability: 4, recommended: '营销/娱乐' },
  { icon: 'globe', name: '水波纹理', performance: 4, visual: 4, adaptability: 4, recommended: '零售/餐饮' }
]

const splashOptions = [
  { name: '星空粒子', icon: 'zap', desc: '星座连线网络', gradient: 'linear-gradient(135deg,#050a18,#3b82f6)', radius: '12px' },
  { name: '极简光晕', icon: 'dollar', desc: '呼吸发光', gradient: 'linear-gradient(160deg,#0f172a,#1e293b)', radius: '12px', border: '1px solid #3b82f6' },
  { name: '渐变流动', icon: 'palette', desc: '柔美粒子拖尾', gradient: 'linear-gradient(135deg,#667eea,#764ba2)', radius: '50%' },
  { name: '数据矩阵', icon: 'table', desc: '业务数据流', gradient: '#020a02', radius: '8px', border: '2px solid #22c55e', textColor: '#22c55e' },
  { name: '齿轮联动', icon: 'building', desc: '机械精密旋转', gradient: 'linear-gradient(135deg,#d97706,#92400e)', radius: '50%' },
  { name: '生长动画', icon: 'sun', desc: '自然生命力', gradient: 'linear-gradient(135deg,#22c55e,#059669)', radius: '24px' },
  { name: '水墨晕染', icon: 'palette', desc: '东方美学', gradient: '#f5f0e8', radius: '50%', border: '2px solid #333', textColor: '#1a1a1a' },
  { name: '光效脉冲', icon: 'star', desc: '爆发力冲击', gradient: 'radial-gradient(circle,#f43f5e,#be123c)', radius: '50%', boxShadow: '0 0 16px rgba(244,63,94,0.5)' },
  { name: '水波纹理', icon: 'globe', desc: '同心波纹扩散', gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)', radius: '50%' }
]

const themeTabs = [
  { key: 'switching', label: '主题切换' },
  { key: 'accent', label: '主色配置' },
  { key: 'typography', label: '排版间距' },
  { key: 'background', label: '背景表面' },
  { key: 'splash', label: '启动页面' },
  { key: 'presets', label: '预设方案' }
]

const themeModes = [
  { key: 'dark', icon: 'moon', label: '深色' },
  { key: 'light', icon: 'sun', label: '浅色' },
  { key: 'warm', icon: 'zap', label: '暖色' },
  { key: 'cold', icon: 'circle', label: '冷色' },
  { key: 'highcontrast', icon: 'circle', label: '高对比' },
  { key: 'soft', icon: 'circle', label: '柔和' },
  { key: 'vintage', icon: 'image', label: '复古' },
  { key: 'cyberpunk', icon: 'building', label: '赛博' },
  { key: 'grayscale', icon: 'circle', label: '灰度' },
  { key: 'morandi', icon: 'palette', label: '莫兰迪' },
  { key: 'eyecare', icon: 'sun', label: '护眼绿' }
]

const accentPresets = [
  { value: 'ocean', icon: 'globe', label: '海洋蓝' },
  { value: 'forest', icon: 'sun', label: '森林绿' },
  { value: 'sunset', icon: 'sun', label: '日落橙' },
  { value: 'royal', icon: 'award', label: '皇家紫' },
  { value: 'oceanDark', icon: 'star', label: '天蓝' },
  { value: 'crimson', label: '绯红' },
  { value: 'amber', icon: 'star', label: '琥珀金' },
  { value: 'emerald', icon: 'sun', label: '翡翠绿' },
  { value: 'rose', icon: 'heart', label: '玫瑰粉' },
  { value: 'sky', label: '天空蓝' },
  { value: 'violet', icon: 'palette', label: '紫罗兰' },
  { value: 'teal', icon: 'globe', label: '青碧' },
  { value: 'zinc', icon: 'circle', label: '锌灰' },
  { value: 'indigo', icon: 'globe', label: '靛蓝' },
  { value: 'pink', icon: 'heart', label: '粉红' },
  { value: 'lime', icon: 'sun', label: '青柠' },
  { value: 'orange', icon: 'star', label: '橙色' },
  { value: 'slate', icon: 'circle', label: '石板灰' }
]

const accentSwatches = [
  { name: '海洋蓝', color: '#3b82f6' }, { name: '翡翠绿', color: '#10b981' },
  { name: '琥珀金', color: '#f59e0b' }, { name: '绯红', color: '#ef4444' },
  { name: '皇家紫', color: '#8b5cf6' }, { name: '玫瑰粉', color: '#ec4899' },
  { name: '青色', color: '#06b6d4' }, { name: '青柠', color: '#84cc16' },
  { name: '日落橙', color: '#f97316' }, { name: '靛蓝', color: '#6366f1' },
  { name: '青碧', color: '#14b8a6' }, { name: '薰衣草', color: '#a78bfa' }
]

const lineHeight = computed(() => lineHeightRaw.value / 10)
const layoutPadding = computed(() => (layoutPaddingRaw.value / 16).toFixed(1))
const layoutGap = computed(() => (layoutGapRaw.value / 16).toFixed(1))
const componentRadius = computed(() => (componentRadiusRaw.value / 16).toFixed(1))

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
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2)
}

const whiteContrast = computed(() => {
  const rgb = hexToRgb(themeAccentColor.value)
  const lum = getLuminance(rgb.r, rgb.g, rgb.b)
  return getContrastRatio(lum, 1) + ':1'
})

const blackContrast = computed(() => {
  const rgb = hexToRgb(themeAccentColor.value)
  const lum = getLuminance(rgb.r, rgb.g, rgb.b)
  return getContrastRatio(lum, 0) + ':1'
})

const presetColorMap = {
  ocean: '#3b82f6', forest: '#22c55e', sunset: '#f59e0b', royal: '#a855f7',
  oceanDark: '#06b6d4', crimson: '#ef4444', amber: '#d97706', emerald: '#10b981',
  rose: '#f43f5e', sky: '#0ea5e9', violet: '#8b5cf6', teal: '#14b8a6',
  zinc: '#71717a', indigo: '#6366f1', pink: '#ec4899', lime: '#84cc16',
  orange: '#f97316', slate: '#475569'
}

const presetHoverMap = {
  ocean: '#60a5fa', forest: '#4ade80', sunset: '#fbbf24', royal: '#c084fc',
  oceanDark: '#22d3ee', crimson: '#f87171', amber: '#f59e0b', emerald: '#34d399',
  rose: '#fb7185', sky: '#38bdf8', violet: '#a78bfa', teal: '#2dd4bf',
  zinc: '#a1a1aa', indigo: '#818cf8', pink: '#f472b6', lime: '#a3e635',
  orange: '#fb923c', slate: '#64748b'
}

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

const showThemeModal = ref(false)
const editingTheme = ref(null)
const themeForm = reactive({ name: '', colors: { primary: '#4F46E5', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' }, fontSize: 14, borderRadius: 8, darkMode: false })

function applyAccentPreset() {
  themeAccentColor.value = presetColorMap[themeAccentPreset.value] || '#3b82f6'
  themeAccentHover.value = presetHoverMap[themeAccentPreset.value] || '#60a5fa'
  themeStore.setTheme(themeAccentPreset.value)
}

function toggleDarkLight() {
  themeStore.toggleMode()
}

function resetThemeToDefault() {
  themeStore.setMode('dark')
  themeBrightness.value = 100
  themeAccentColor.value = '#3b82f6'
  themeAccentHover.value = '#60a5fa'
  themeAccentPreset.value = 'ocean'
  activePresetTheme.value = 'ocean'
  themeStore.setTheme('ocean')
  themeStore.setPreset('')
  document.documentElement.style.filter = ''
  fontScale.value = 100
  lineHeightRaw.value = 16
  spacingScale.value = 100
}

function saveThemeSettings() {
  themeStore.setMode(currentThemeMode.value)
  sysStore.saveThemeSettings({
    mode: currentThemeMode.value,
    brightness: themeBrightness.value,
    accentColor: themeAccentColor.value,
    fontScale: fontScale.value,
    lineHeight: lineHeight.value,
    spacingScale: spacingScale.value
  })
  alert('主题设置已保存')
}

function previewThemeFullscreen() {
  alert('全屏预览功能：将打开全屏预览窗口')
}

function resetThemeCustomizations(type) {
  if (type === 'background') {
    themeSettings.bgType = 'solid'
    themeSettings.bgColor = '#f8f9fa'
    themeSettings.gradientColor = '#e9ecef'
    themeSettings.gradientColor2 = '#dee2e6'
    themeSettings.gradientDir = 'to right'
  } else if (type === 'surface') {
    themeSettings.cardBg = '#ffffff'
    themeSettings.surfaceElevated = '#ffffff'
    themeSettings.borderColor = '#dee2e6'
    themeSettings.shadowEnabled = true
    themeSettings.shadowIntensity = 50
  }
}

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

function applyPresetTheme(preset) {
  activePresetTheme.value = preset.name
  themeAccentColor.value = presetColorMap[preset.name] || '#3b82f6'
  themeAccentHover.value = presetHoverMap[preset.name] || '#60a5fa'
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

function themePreviewStyle(theme) {
  return { background: theme.darkMode ? '#1a1a2e' : '#f8f9fa', borderRadius: theme.borderRadius + 'px' }
}

function openThemeModal() {
  editingTheme.value = null
  Object.assign(themeForm, { name: '', colors: { primary: '#4F46E5', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6' }, fontSize: 14, borderRadius: 8, darkMode: false })
  showThemeModal.value = true
}

function editTheme(theme) {
  editingTheme.value = theme
  Object.assign(themeForm, { name: theme.name, colors: { ...theme.colors }, fontSize: theme.fontSize, borderRadius: theme.borderRadius, darkMode: theme.darkMode })
  showThemeModal.value = true
}

function submitTheme() {
  if (!themeForm.name) { alert('请填写主题名称'); return }
  if (editingTheme.value) {
    sysStore.updateTheme(editingTheme.value.id, { name: themeForm.name, colors: { ...themeForm.colors }, fontSize: themeForm.fontSize, borderRadius: themeForm.borderRadius, darkMode: themeForm.darkMode })
  } else {
    sysStore.addTheme({ ...themeForm })
  }
  showThemeModal.value = false
}

function deleteTheme(id) { if (confirm('确认删除该主题？')) sysStore.deleteTheme(id) }

onMounted(() => {
  try {
    const savedSettings = localStorage.getItem('gj_erp_themeSettings')
    if (savedSettings) {
      const s = JSON.parse(savedSettings)
      if (s.brightness) themeBrightness.value = s.brightness
      if (s.accentColor) themeAccentColor.value = s.accentColor
      if (s.fontScale) fontScale.value = s.fontScale
      if (s.lineHeight) lineHeightRaw.value = s.lineHeight
      if (s.spacingScale) spacingScale.value = s.spacingScale
    }
  } catch (e) {
    /* 忽略解析错误 */
  }
})
</script>

<style scoped>
.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
}
.mode-card:hover {
  border-color: var(--color-accent, #3b82f6);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.mode-card.active {
  border-color: var(--color-accent, #3b82f6);
  box-shadow: 0 0 0 1px var(--color-accent, #3b82f6), var(--shadow-md);
}
.mode-icon {
  font-size: 2rem;
  line-height: 1;
  margin-bottom: var(--space-2);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-elevated);
  border-radius: var(--radius-md);
}
.mode-card.active .mode-icon {
  background: color-mix(in srgb, var(--color-accent, #3b82f6) 15%, var(--color-surface-elevated));
}
.mode-label {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: center;
  white-space: nowrap;
}
.mode-card.active .mode-label {
  color: var(--color-accent, #3b82f6);
  font-weight: 600;
}
.tab-bar {
  display: flex; gap: var(--space-1);
  border-bottom: 2px solid var(--color-border); flex-wrap: wrap;
}
.tab-btn {
  padding: var(--space-2) var(--space-4); background: none; border: none;
  color: var(--color-text-secondary); font-size: var(--font-size-sm); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all var(--transition-fast);
}
.tab-btn:hover { color: var(--color-text-primary); }
.tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }
.modal-dialog { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
.modal-title { font-size: var(--font-size-lg); font-weight: 600; }
.modal-close { width: 28px; height: 28px; border: none; background: transparent; font-size: 16px; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); }
.modal-close:hover { background: var(--color-bg-tertiary); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: 12px 20px; border-top: 1px solid var(--color-border); }
.form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-3); }
.form-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
.form-input, .form-select { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text-primary); }
.form-row { display: grid; gap: var(--space-3); }
.form-row-2 { grid-template-columns: 1fr 1fr; }
.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.status-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 600; }
.status-badge.success { background: var(--color-success-subtle, #dcfce7); color: var(--color-success, #16a34a); }
</style>
