export const DEFAULT_THEME_KEY = 'ocean'
export const DEFAULT_PRESET_KEY = ''
export const DEFAULT_MODE_KEY = 'dark'

export const themeOptions = [
  {
    key: 'ocean',
    name: '海洋蓝',
    color: '#3b82f6',
    hover: '#60a5fa',
    desc: '专业沉稳，适合企业办公',
    colors: ['#3b82f6', '#60a5fa', '#1e40af']
  },
  {
    key: 'forest',
    name: '森林绿',
    color: '#22c55e',
    hover: '#4ade80',
    desc: '自然清新，适合环保行业',
    colors: ['#22c55e', '#4ade80', '#166534']
  },
  {
    key: 'sunset',
    name: '日落橙',
    color: '#f59e0b',
    hover: '#fbbf24',
    desc: '温暖活力，适合营销团队',
    colors: ['#f59e0b', '#fbbf24', '#b45309']
  },
  {
    key: 'royal',
    name: '皇家紫',
    color: '#a855f7',
    hover: '#c084fc',
    desc: '高贵典雅，适合设计团队',
    colors: ['#a855f7', '#c084fc', '#7e22ce']
  },
  {
    key: 'crimson',
    name: '赤焰红',
    color: '#ef4444',
    hover: '#f87171',
    desc: '热情奔放，适合销售团队',
    colors: ['#ef4444', '#f87171', '#b91c1c']
  },
  {
    key: 'emerald',
    name: '翡翠绿',
    color: '#10b981',
    hover: '#34d399',
    desc: '清新明亮，适合数据看板',
    colors: ['#10b981', '#34d399', '#065f46']
  },
  {
    key: 'rose',
    name: '玫瑰粉',
    color: '#f43f5e',
    hover: '#fb7185',
    desc: '温柔浪漫，适合创意团队',
    colors: ['#f43f5e', '#fb7185', '#be123c']
  },
  {
    key: 'indigo',
    name: '靛蓝',
    color: '#6366f1',
    hover: '#818cf8',
    desc: '沉稳智慧，适合技术团队',
    colors: ['#6366f1', '#818cf8', '#4338ca']
  },
  {
    key: 'amber',
    name: '琥珀',
    color: '#d97706',
    hover: '#f59e0b',
    desc: '经典稳重，适合传统行业',
    colors: ['#d97706', '#f59e0b', '#92400e']
  },
  {
    key: 'teal',
    name: '青碧',
    color: '#14b8a6',
    hover: '#2dd4bf',
    desc: '现代简约，适合科技行业',
    colors: ['#14b8a6', '#2dd4bf', '#0f766e']
  },
  {
    key: 'pink',
    name: '粉红',
    color: '#ec4899',
    hover: '#f472b6',
    desc: '活泼可爱，适合年轻团队',
    colors: ['#ec4899', '#f472b6', '#be185d']
  },
  {
    key: 'slate',
    name: '石板灰',
    color: '#64748b',
    hover: '#94a3b8',
    desc: '低调内敛，适合金融行业',
    colors: ['#64748b', '#94a3b8', '#334155']
  },
  {
    key: 'sky',
    name: '天空蓝',
    color: '#0ea5e9',
    hover: '#38bdf8',
    desc: '清爽明朗，适合教育行业',
    colors: ['#0ea5e9', '#38bdf8', '#0369a1']
  },
  {
    key: 'lime',
    name: '青柠',
    color: '#84cc16',
    hover: '#a3e635',
    desc: '活力四射，适合运动品牌',
    colors: ['#84cc16', '#a3e635', '#4d7c0f']
  },
  {
    key: 'orange',
    name: '橙色',
    color: '#f97316',
    hover: '#fb923c',
    desc: '热情创新，适合创业团队',
    colors: ['#f97316', '#fb923c', '#c2410c']
  },
  {
    key: 'cyan',
    name: '青色',
    color: '#06b6d4',
    hover: '#22d3ee',
    desc: '冷静理性，适合医疗行业',
    colors: ['#06b6d4', '#22d3ee', '#0e7490']
  },
  {
    key: 'violet',
    name: '紫罗兰',
    color: '#8b5cf6',
    hover: '#a78bfa',
    desc: '神秘优雅，适合艺术行业',
    colors: ['#8b5cf6', '#a78bfa', '#6d28d9']
  },
  {
    key: 'yellow',
    name: '黄色',
    color: '#eab308',
    hover: '#facc15',
    desc: '阳光积极，适合儿童产品',
    colors: ['#eab308', '#facc15', '#a16207']
  },
  {
    key: 'zinc',
    name: '锌灰',
    color: '#71717a',
    hover: '#a1a1aa',
    desc: '中性克制，适合信息密集场景',
    colors: ['#71717a', '#a1a1aa', '#3f3f46']
  }
]

export const presetOptions = [
  { key: 'aurora', name: '极光', desc: '梦幻极光色调' },
  { key: 'deepOcean', name: '深海', desc: '深邃海洋风格' },
  { key: 'minimal', name: '极简', desc: '纯净简洁风格' },
  { key: 'nature', name: '自然', desc: '绿色生态风格' }
]

export const modeOptions = [
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

export const accentPresets = themeOptions.map((theme) => ({
  value: theme.key,
  label: theme.name
}))

export const accentSwatches = themeOptions.slice(0, 12).map((theme) => ({
  name: theme.name,
  color: theme.color
}))

export const presetThemeList = themeOptions
  .filter((theme) => ['ocean', 'forest', 'sunset', 'royal', 'crimson', 'emerald'].includes(theme.key))
  .map((theme) => ({
    name: theme.key,
    label: theme.name,
    color: theme.color,
    desc: theme.desc,
    colors: theme.colors
  }))

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

export const themeColorMap = Object.fromEntries(themeOptions.map((theme) => [theme.key, theme.color]))
export const themeHoverMap = Object.fromEntries(themeOptions.map((theme) => [theme.key, theme.hover]))

export function createDefaultThemeSettings() {
  return {
    brightness: 100,
    fontScale: 100,
    lineHeight: 1.6,
    spacingScale: 100,
    layoutPadding: 1.0,
    layoutGap: 1.0,
    componentRadius: 0.5,
    bgType: 'solid',
    bgColor: '#0f172a',
    gradientColor: '#1e293b',
    gradientColor2: '#0f172a',
    gradientDir: 'to bottom',
    cardBg: '#1e293b',
    surfaceElevated: '#1a2332',
    borderColor: '#475569',
    shadowEnabled: true,
    shadowIntensity: 50,
    splash: '星空粒子',
    splashBgPattern: 'auto',
    accentPreset: DEFAULT_THEME_KEY,
    accentColor: themeColorMap[DEFAULT_THEME_KEY],
    accentHover: themeHoverMap[DEFAULT_THEME_KEY],
    autoSwitch: {
      enabled: false,
      followSystem: true,
      schedule: {
        lightStart: '07:00',
        darkStart: '19:00'
      }
    },
    animation: {
      enabled: true,
      transitionDuration: 300,
      reduceMotion: false
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      focusVisible: true
    }
  }
}
