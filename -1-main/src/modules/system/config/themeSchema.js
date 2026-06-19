/**
 * Theme Configuration Schema
 * Declarative UI definition for ThemeSettings page.
 * Each section = one tab. Each group = one card. Each field = one control.
 */

export const themeModes = [
  { key: 'dark', name: '深色', icon: 'moon', desc: '深色背景，适合夜间使用' },
  { key: 'light', name: '浅色', icon: 'sun', desc: '浅色背景，适合日间使用' },
  { key: 'warm', name: '暖色', icon: 'zap', desc: '暖色调，舒适温馨' },
  { key: 'cold', name: '冷色', icon: 'circle', desc: '冷色调，清爽专注' },
  { key: 'highcontrast', name: '高对比', icon: 'circle', desc: '高对比度，提升可读性' },
  { key: 'soft', name: '柔和', icon: 'circle', desc: '柔和色调，减少视觉疲劳' },
  { key: 'vintage', name: '复古', icon: 'image', desc: '复古风格，经典怀旧' },
  { key: 'cyberpunk', name: '赛博', icon: 'building', desc: '赛博朋克，未来科技' },
  { key: 'grayscale', name: '灰度', icon: 'circle', desc: '灰度模式，专注工作' },
  { key: 'morandi', name: '莫兰迪', icon: 'palette', desc: '莫兰迪色系，高级质感' },
  { key: 'eyecare', name: '护眼绿', icon: 'sun', desc: '护眼模式，长时间使用' }
]

export const accentPresets = [
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

export const accentSwatches = [
  { name: '海洋蓝', color: '#3b82f6' },
  { name: '翡翠绿', color: '#10b981' },
  { name: '琥珀金', color: '#f59e0b' },
  { name: '绯红', color: '#ef4444' },
  { name: '皇家紫', color: '#8b5cf6' },
  { name: '玫瑰粉', color: '#ec4899' },
  { name: '青色', color: '#06b6d4' },
  { name: '青柠', color: '#84cc16' },
  { name: '日落橙', color: '#f97316' },
  { name: '靛蓝', color: '#6366f1' },
  { name: '青碧', color: '#14b8a6' },
  { name: '薰衣草', color: '#a78bfa' }
]

export const splashOptions = [
  {
    name: '星空粒子',
    icon: 'zap',
    desc: '星座连线网络',
    gradient: 'linear-gradient(135deg,#050a18,#3b82f6)',
    radius: '12px'
  },
  {
    name: '极简光晕',
    icon: 'dollar-sign',
    desc: '呼吸发光',
    gradient: 'linear-gradient(160deg,#0f172a,#1e293b)',
    radius: '12px',
    border: '1px solid #3b82f6'
  },
  {
    name: '渐变流动',
    icon: 'palette',
    desc: '柔美粒子拖尾',
    gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
    radius: '50%'
  },
  {
    name: '数据矩阵',
    icon: 'table',
    desc: '业务数据流',
    gradient: '#020a02',
    radius: '8px',
    border: '2px solid #22c55e',
    textColor: '#22c55e'
  },
  {
    name: '齿轮联动',
    icon: 'building',
    desc: '机械精密旋转',
    gradient: 'linear-gradient(135deg,#d97706,#92400e)',
    radius: '50%'
  },
  {
    name: '生长动画',
    icon: 'sun',
    desc: '自然生命力',
    gradient: 'linear-gradient(135deg,#22c55e,#059669)',
    radius: '24px'
  },
  {
    name: '水墨晕染',
    icon: 'palette',
    desc: '东方美学',
    gradient: '#f5f0e8',
    radius: '50%',
    border: '2px solid #333',
    textColor: '#1a1a1a'
  },
  {
    name: '光效脉冲',
    icon: 'star',
    desc: '爆发力冲击',
    gradient: 'radial-gradient(circle,#f43f5e,#be123c)',
    radius: '50%',
    boxShadow: '0 0 16px rgba(244,63,94,0.5)'
  },
  {
    name: '水波纹理',
    icon: 'globe',
    desc: '同心波纹扩散',
    gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
    radius: '50%'
  }
]

export const splashComparisonRows = [
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

export const presetThemeList = [
  {
    name: 'ocean',
    label: '海洋蓝',
    color: '#3b82f6',
    desc: '专业沉稳，适合企业办公',
    colors: ['#3b82f6', '#60a5fa', '#1e40af']
  },
  {
    name: 'forest',
    label: '森林绿',
    color: '#22c55e',
    desc: '自然清新，适合环保行业',
    colors: ['#22c55e', '#4ade80', '#166534']
  },
  {
    name: 'sunset',
    label: '日落橙',
    color: '#f59e0b',
    desc: '温暖活力，适合营销团队',
    colors: ['#f59e0b', '#fbbf24', '#b45309']
  },
  {
    name: 'royal',
    label: '皇家紫',
    color: '#a855f7',
    desc: '高贵典雅，适合设计团队',
    colors: ['#a855f7', '#c084fc', '#7e22ce']
  },
  {
    name: 'crimson',
    label: '绯红',
    color: '#ef4444',
    desc: '热情奔放，适合销售团队',
    colors: ['#ef4444', '#f87171', '#b91c1c']
  },
  {
    name: 'emerald',
    label: '翡翠绿',
    color: '#10b981',
    desc: '清新明亮，适合数据看板',
    colors: ['#10b981', '#34d399', '#065f46']
  }
]

/**
 * Schema sections define the UI structure.
 * Each section maps to a tab.
 * Each group maps to a card within the tab.
 * Each field maps to a form control.
 *
 * Field types:
 * - modeGrid: visual mode selector grid
 * - range: slider with min/max/step/unit
 * - color: color picker + hex input
 * - select: dropdown
 * - toggle: switch
 * - radio: radio button group
 * - time: time input
 * - textarea: multi-line text
 * - buttonGroup: action buttons
 * - statusPreview: read-only status display
 * - livePreview: dynamic preview box
 * - infoBox: informational card
 * - splashGrid: splash animation selector
 * - presetGrid: theme preset cards
 * - comparisonTable: data table
 * - colorSwatches: color dot grid
 * - colorSystem: color palette display
 * - typographyPreview: typography demo
 * - bgSurfacePreview: background & surface demo
 * - customPreset: save/load/delete preset form
 */
export const themeSchema = [
  {
    key: 'switching',
    label: '主题切换',
    icon: 'monitor',
    groups: [
      {
        title: '外观模式',
        icon: 'monitor',
        fields: [
          { type: 'modeGrid', key: 'mode', label: '选择显示模式', hint: 'desc' },
          { type: 'range', key: 'brightness', label: '亮度调节', min: 50, max: 150, step: 1, unit: '%' },
          {
            type: 'buttonGroup',
            actions: [
              { label: '明暗切换', icon: 'refresh-cw', action: 'toggleMode' },
              { label: '恢复默认', icon: 'rotate-ccw', action: 'resetDefault' }
            ]
          }
        ]
      },
      {
        title: '当前状态',
        icon: 'info',
        fields: [
          {
            type: 'statusPreview',
            items: [
              { label: '模式', key: 'modeName' },
              { label: '亮度', key: 'brightness', suffix: '%' },
              { label: '主题色', key: 'accentColor', format: 'colorDot' },
              { label: '过渡动画', key: 'transitionDuration', suffix: 'ms' }
            ]
          },
          { type: 'livePreview', style: 'accent' }
        ]
      },
      {
        title: '自动主题切换',
        icon: 'clock',
        headerToggle: { key: 'autoSwitch.enabled', label: '启用自动切换' },
        fields: [
          {
            type: 'radio',
            key: 'autoSwitch.followSystem',
            label: '切换方式',
            options: [
              { value: true, label: '跟随系统设置' },
              { value: false, label: '按时间 schedule' }
            ]
          },
          {
            type: 'time',
            key: 'autoSwitch.schedule.lightStart',
            label: '浅色模式开始时间',
            condition: { key: 'autoSwitch.followSystem', value: false }
          },
          {
            type: 'time',
            key: 'autoSwitch.schedule.darkStart',
            label: '深色模式开始时间',
            condition: { key: 'autoSwitch.followSystem', value: false }
          },
          { type: 'infoBox', content: '系统将根据您的设置自动在浅色和深色模式间切换' }
        ]
      }
    ]
  },
  {
    key: 'accent',
    label: '主色配置',
    icon: 'palette',
    groups: [
      {
        title: '主色配置',
        icon: 'palette',
        fields: [
          {
            type: 'select',
            key: 'accentPreset',
            label: '选择主题色',
            options: accentPresets,
            action: 'applyAccentPreset'
          },
          { type: 'color', key: 'accentColor', label: '自定义主色' },
          { type: 'color', key: 'accentHover', label: '悬停色', readOnly: true },
          { type: 'contrastDisplay', label: '对比度检测' },
          { type: 'colorSwatches', label: '预设主色', swatches: accentSwatches, targetKey: 'accentColor' }
        ]
      },
      {
        title: '主色预览',
        icon: 'eye',
        fields: [{ type: 'accentPreview' }]
      }
    ]
  },
  {
    key: 'typography',
    label: '排版间距',
    icon: 'type',
    groups: [
      {
        title: '字体缩放',
        icon: 'type',
        fields: [
          { type: 'range', key: 'fontScale', label: '全局字体缩放', min: 75, max: 150, step: 5, unit: '%' },
          { type: 'range', key: 'lineHeight', label: '行高', min: 1.2, max: 2.4, step: 0.1, format: 'decimal' }
        ]
      },
      {
        title: '布局间距',
        icon: 'layout',
        fields: [
          { type: 'range', key: 'spacingScale', label: '间距缩放', min: 50, max: 200, step: 10, unit: '%' },
          { type: 'range', key: 'layoutPadding', label: '组件内边距', min: 0.25, max: 2.0, step: 0.125, format: 'rem' },
          { type: 'range', key: 'layoutGap', label: '组件间距', min: 0.25, max: 2.0, step: 0.125, format: 'rem' },
          { type: 'range', key: 'componentRadius', label: '组件圆角', min: 0, max: 1.5, step: 0.0625, format: 'rem' }
        ]
      },
      {
        title: '排版间距预览',
        icon: 'eye',
        fields: [{ type: 'typographyPreview' }]
      }
    ]
  },
  {
    key: 'background',
    label: '背景表面',
    icon: 'image',
    groups: [
      {
        title: '背景配置',
        icon: 'image',
        fields: [
          {
            type: 'select',
            key: 'bgType',
            label: '背景类型',
            options: [
              { value: 'solid', label: '纯色' },
              { value: 'gradient', label: '渐变' }
            ]
          },
          { type: 'color', key: 'bgColor', label: '背景颜色', condition: { key: 'bgType', value: 'solid' } },
          { type: 'color', key: 'gradientColor', label: '渐变起始色', condition: { key: 'bgType', value: 'gradient' } },
          {
            type: 'color',
            key: 'gradientColor2',
            label: '渐变终止色',
            condition: { key: 'bgType', value: 'gradient' }
          },
          {
            type: 'select',
            key: 'gradientDir',
            label: '渐变方向',
            condition: { key: 'bgType', value: 'gradient' },
            options: [
              { value: 'to right', label: '向右' },
              { value: 'to bottom', label: '向下' },
              { value: 'to bottom right', label: '右下' },
              { value: '135deg', label: '135°' },
              { value: 'to top', label: '向上' },
              { value: 'to left', label: '向左' }
            ]
          },
          {
            type: 'buttonGroup',
            actions: [{ label: '重置为模式默认背景', icon: 'rotate-ccw', action: 'resetBackground' }]
          }
        ]
      },
      {
        title: '表面样式',
        icon: 'layers',
        fields: [
          { type: 'color', key: 'cardBg', label: '卡片背景色' },
          { type: 'color', key: 'surfaceElevated', label: '提升表面色' },
          { type: 'color', key: 'borderColor', label: '边框色' },
          { type: 'toggle', key: 'shadowEnabled', label: '启用阴影' },
          {
            type: 'range',
            key: 'shadowIntensity',
            label: '阴影强度',
            min: 10,
            max: 100,
            step: 10,
            unit: '%',
            condition: { key: 'shadowEnabled', value: true }
          },
          {
            type: 'buttonGroup',
            actions: [{ label: '重置为模式默认表面', icon: 'rotate-ccw', action: 'resetSurface' }]
          }
        ]
      },
      {
        title: '背景与表面预览',
        icon: 'eye',
        fields: [{ type: 'bgSurfacePreview' }]
      }
    ]
  },
  {
    key: 'accessibility',
    label: '动画与无障碍',
    icon: 'shield',
    groups: [
      {
        title: '动画设置',
        icon: 'zap',
        fields: [
          { type: 'toggle', key: 'animation.enabled', label: '启用过渡动画' },
          {
            type: 'range',
            key: 'animation.transitionDuration',
            label: '动画时长',
            min: 0,
            max: 1000,
            step: 50,
            unit: 'ms'
          },
          { type: 'toggle', key: 'animation.reduceMotion', label: '减少动态效果（偏好减少动画）' }
        ]
      },
      {
        title: '无障碍',
        icon: 'shield',
        fields: [
          { type: 'toggle', key: 'accessibility.highContrast', label: '启用高对比度模式' },
          { type: 'toggle', key: 'accessibility.largeText', label: '启用大字体模式' },
          { type: 'toggle', key: 'accessibility.focusVisible', label: '显示焦点轮廓（键盘导航）' }
        ]
      }
    ]
  },
  {
    key: 'splash',
    label: '启动页面',
    icon: 'sparkles',
    groups: [
      {
        title: '智能推荐引擎',
        icon: 'sparkles',
        fields: [
          { type: 'infoBox', content: '基于当前主题模式和用户偏好自动推荐最佳启动动画方案。' },
          {
            type: 'buttonGroup',
            actions: [
              { label: '一键应用推荐', icon: 'target', action: 'applyAutoSplash' },
              { label: '重新分析', icon: 'refresh-cw', action: 'refreshSplash' },
              { label: '应用动态配色', icon: 'palette', action: 'applyDynamicSplash' }
            ]
          }
        ]
      },
      {
        title: '启动动画方案',
        icon: 'activity',
        fields: [
          { type: 'splashGrid', key: 'splash', options: splashOptions },
          {
            type: 'select',
            key: 'splashBgPattern',
            label: 'UI背景图自动搭配',
            options: [
              { value: 'auto', label: '自动匹配主题' },
              { value: 'dots', label: '圆点纹理' },
              { value: 'grid', label: '网格纹理' },
              { value: 'waves', label: '波纹纹理' },
              { value: 'none', label: '无纹理' }
            ]
          },
          { type: 'buttonGroup', actions: [{ label: '预览当前方案', icon: 'eye', action: 'previewSplash' }] }
        ]
      },
      {
        title: '方案对比',
        icon: 'list',
        fields: [
          {
            type: 'comparisonTable',
            columns: [
              { key: 'name', label: '方案', icon: true },
              { key: 'performance', label: '性能', format: 'stars' },
              { key: 'visual', label: '视觉', format: 'stars' },
              { key: 'adaptability', label: '适配', format: 'stars' },
              { key: 'recommended', label: '推荐场景' }
            ],
            rows: splashComparisonRows
          }
        ]
      }
    ]
  },
  {
    key: 'presets',
    label: '预设方案',
    icon: 'target',
    groups: [
      {
        title: '预设主题方案',
        icon: 'target',
        fields: [{ type: 'presetGrid', key: 'activePreset', options: presetThemeList }]
      },
      {
        title: '自定义预设',
        icon: 'save',
        fields: [{ type: 'customPreset' }]
      },
      {
        title: '色彩系统参考',
        icon: 'list',
        headerActions: [
          { label: '刷新', icon: 'refresh-cw', action: 'refreshColorSystem' },
          { label: '重置所有自定义', icon: 'rotate-ccw', action: 'resetAllCustom' }
        ],
        fields: [{ type: 'colorSystem' }]
      }
    ]
  }
]
