/**
 * ECharts 4套大屏主题配置
 * 每套主题包含：颜色数组、渐变、tooltip、axis、legend等
 */

/* 深蓝科技风（默认） */
export const darkTechTheme = {
  color: ['#00d4ff', '#00ff88', '#ffa940', '#722ed1', '#ff4d4f', '#13c2c2', '#eb2f96', '#2f54eb'],
  backgroundColor: 'transparent',
  title: {
    textStyle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }
  },
  tooltip: {
    backgroundColor: 'rgba(10, 14, 39, 0.95)',
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderWidth: 1,
    textStyle: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
    extraCssText: 'border-radius:8px;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.4);'
  },
  legend: {
    textStyle: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
    pageTextStyle: { color: 'rgba(255,255,255,0.45)' }
  },
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
    splitLine: { show: false }
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
  }
}

/* 金色商务风 */
export const goldBizTheme = {
  color: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#fcd34d', '#fde68a'],
  backgroundColor: 'transparent',
  title: {
    textStyle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }
  },
  tooltip: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    textStyle: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
    extraCssText: 'border-radius:8px;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.4);'
  },
  legend: {
    textStyle: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
    pageTextStyle: { color: 'rgba(255,255,255,0.45)' }
  },
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
    splitLine: { show: false }
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
  }
}

/* 赛博朋克风 */
export const cyberpunkTheme = {
  color: ['#ff00ff', '#00ffff', '#ff0066', '#66ff00', '#ffff00', '#ff6600', '#6600ff', '#00ff66'],
  backgroundColor: 'transparent',
  title: {
    textStyle: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: 600 }
  },
  tooltip: {
    backgroundColor: 'rgba(13, 13, 13, 0.95)',
    borderColor: 'rgba(255, 0, 255, 0.3)',
    borderWidth: 1,
    textStyle: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
    extraCssText: 'border-radius:8px;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(255,0,255,0.15);'
  },
  legend: {
    textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    pageTextStyle: { color: 'rgba(255,255,255,0.5)' }
  },
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
    splitLine: { show: false }
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }
  }
}

/* 极简白风 */
export const lightCleanTheme = {
  color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'],
  backgroundColor: 'transparent',
  title: {
    textStyle: { color: 'rgba(15,23,42,0.9)', fontSize: 14, fontWeight: 600 }
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
    textStyle: { color: 'rgba(15,23,42,0.9)', fontSize: 12 },
    extraCssText: 'border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.1);'
  },
  legend: {
    textStyle: { color: 'rgba(15,23,42,0.65)', fontSize: 11 },
    pageTextStyle: { color: 'rgba(15,23,42,0.45)' }
  },
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(15,23,42,0.45)', fontSize: 11 },
    splitLine: { show: false }
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'rgba(15,23,42,0.45)', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } }
  }
}

/** 主题映射 */
export const themeMap = {
  'dark-tech': darkTechTheme,
  'gold-biz': goldBizTheme,
  cyberpunk: cyberpunkTheme,
  'light-clean': lightCleanTheme
}

/** 获取主题颜色数组 */
export function getThemeColors(themeName) {
  return themeMap[themeName]?.color || darkTechTheme.color
}

/** 获取ECharts主题option基础配置 */
export function getBaseOption(themeName) {
  const theme = themeMap[themeName] || darkTechTheme
  return {
    color: theme.color,
    backgroundColor: theme.backgroundColor,
    title: theme.title,
    tooltip: { ...theme.tooltip, trigger: 'axis' },
    legend: { ...theme.legend, top: 0, right: 0 },
    grid: { top: 40, right: 16, bottom: 24, left: 16, containLabel: true },
    xAxis: theme.categoryAxis,
    yAxis: theme.valueAxis,
    animationDuration: 1200,
    animationEasing: 'cubicOut'
  }
}
