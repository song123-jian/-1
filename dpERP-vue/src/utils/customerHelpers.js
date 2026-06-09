/**
 * 客户模块公共工具函数
 * 提供等级颜色映射、等级标签、标签名称/样式获取等通用功能
 */

export const levelColors = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' }

export const levelLabelMap = { A: '大客户', B: 'B类客户', C: 'C类客户' }

export function levelLabel(level) {
  return levelLabelMap[level] || level || '-'
}

export function getTagName(tags, tagId) {
  const tag = tags?.find(t => t.id === tagId)
  return tag ? tag.name : tagId
}

export function getTagStyle(tags, tagId) {
  const tag = tags?.find(t => t.id === tagId)
  return tag ? { background: tag.color + '20', color: tag.color } : {}
}
