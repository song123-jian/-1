/**
 * 加密工具模块
 * 提供 AES-GCM 安全加密、向后兼容的 XOR 加密（已废弃）、简单哈希函数
 *
 * 安全等级说明：
 * - aesEncrypt/aesDecrypt: 安全，基于 Web Crypto API 的 AES-256-GCM + PBKDF2
 * - encrypt/decrypt: 不安全，仅XOR混淆，已标记 @deprecated
 * - simpleHash/hashPassword: 不安全，仅用于非安全场景的校验和
 */

// 不安全的简单哈希 - 仅用于非安全场景的校验和，不可用于密码存储
export function simpleHash(str) {
  if (!str) return ''
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// @deprecated 使用 aesEncrypt 替代。XOR加密完全不安全，仅保留向后兼容
export function encrypt(text, key = 'gj_erp') {
  return text
    .split('')
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('')
}

// @deprecated 使用 aesDecrypt 替代。XOR解密完全不安全，仅保留向后兼容
export function decrypt(text, key = 'gj_erp') {
  return encrypt(text, key)
}

// AES-GCM 加密（基于 Web Crypto API）
// 使用 PBKDF2 从密码派生密钥，AES-256-GCM 加密，随机 salt + iv
export async function aesEncrypt(plaintext, password) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(encrypted), salt.length + iv.length)
  /* 分块拼接避免大数组展开导致栈溢出 */
  let binary = ''
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i])
  }
  return btoa(binary)
}

// AES-GCM 解密（基于 Web Crypto API）
export async function aesDecrypt(ciphertext, password) {
  const dec = new TextDecoder()
  const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const salt = data.slice(0, 16)
  const iv = data.slice(16, 28)
  const encrypted = data.slice(28)
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return dec.decode(decrypted)
}

// 向后兼容：hashPassword 是 simpleHash 的别名
// 注意：此函数不安全，不可用于密码存储
export const hashPassword = simpleHash

/**
 * @deprecated 使用 aesEncrypt 替代。加密数据用于本地存储
 */
export function encryptForStorage(data, key) {
  if (data === undefined || data === null) return ''
  try {
    const jsonStr = JSON.stringify(data)
    return encrypt(jsonStr, key)
  } catch (e) {
    return ''
  }
}

/**
 * @deprecated 使用 aesDecrypt 替代。从本地存储解密数据
 */
export function decryptFromStorage(encrypted, key) {
  if (!encrypted) return null
  try {
    const jsonStr = decrypt(encrypted, key)
    if (!jsonStr) return null
    return JSON.parse(jsonStr)
  } catch (e) {
    return null
  }
}
