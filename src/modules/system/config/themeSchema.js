import {
  accentPresets,
  accentSwatches,
  modeOptions as themeModes,
  presetThemeList,
  splashComparisonRows,
  splashOptions
} from '@/theme/catalog'

export { accentSwatches, themeModes }

/**
 * Theme Configuration Schema
 * Declarative UI definition for ThemeSettings page.
 * Each section = one tab. Each group = one card. Each field = one control.
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
              { value: false, label: '按时间切换' }
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
