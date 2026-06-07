export function safeGetItem(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
export function safeSetItem(key, value) {
  try { localStorage.setItem(key, value) } catch (e) { console.error('存储失败:', key, e) }
}
export function safeGetJSON(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null }
}
export function safeSetJSON(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch (e) { console.error('存储失败:', key, e) }
}
export function safeRemoveItem(key) {
  try { localStorage.removeItem(key) } catch {}
}
