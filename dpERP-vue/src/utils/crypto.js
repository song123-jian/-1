/**
 * 敏感数据加密工具
 * 用于 dpERP-vue 项目中敏感数据的加密、解密与哈希处理
 * 注意：本工具仅用于基本的数据混淆，不适用于真正的安全场景
 */

/**
 * 默认密钥，基于应用名称派生
 */
const DEFAULT_KEY = 'gj_erp'

/**
 * 将字符串转换为UTF-8字节数组
 * @param {string} str - 输入字符串
 * @returns {number[]} UTF-8字节数组
 */
function stringToBytes(str) {
  const encoder = new TextEncoder()
  return Array.from(encoder.encode(str))
}

/**
 * 将UTF-8字节数组转换为字符串
 * @param {number[]} bytes - 字节数组
 * @returns {string} 解码后的字符串
 */
function bytesToString(bytes) {
  const decoder = new TextDecoder()
  return decoder.decode(new Uint8Array(bytes))
}

/**
 * 将字节数组编码为Base64字符串
 * @param {number[]} bytes - 字节数组
 * @returns {string} Base64编码字符串
 */
function bytesToBase64(bytes) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/**
 * 将Base64字符串解码为字节数组
 * @param {string} base64 - Base64编码字符串
 * @returns {number[]} 字节数组
 */
function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = []
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i))
  }
  return bytes
}

/**
 * 加密文本
 * 使用基于XOR的简单加密算法，对文本与密钥逐字节异或后返回Base64编码
 * @param {string} text - 需要加密的明文
 * @param {string} key - 加密密钥，未提供时使用默认密钥
 * @returns {string} Base64编码的加密字符串
 */
export function encrypt(text, key) {
  if (!text) return ''

  const actualKey = key || DEFAULT_KEY
  const textBytes = stringToBytes(String(text))
  const keyBytes = stringToBytes(actualKey)

  // 对每个字节与密钥对应字节进行XOR运算
  const encryptedBytes = textBytes.map((byte, index) => {
    return byte ^ keyBytes[index % keyBytes.length]
  })

  return bytesToBase64(encryptedBytes)
}

/**
 * 解密文本
 * 对Base64编码的加密字符串进行XOR解密，还原原始文本
 * @param {string} encrypted - Base64编码的加密字符串
 * @param {string} key - 解密密钥，未提供时使用默认密钥
 * @returns {string} 解密后的原始文本
 */
export function decrypt(encrypted, key) {
  if (!encrypted) return ''

  try {
    const actualKey = key || DEFAULT_KEY
    const encryptedBytes = base64ToBytes(encrypted)
    const keyBytes = stringToBytes(actualKey)

    // XOR运算是对称的，再次异或即可还原
    const decryptedBytes = encryptedBytes.map((byte, index) => {
      return byte ^ keyBytes[index % keyBytes.length]
    })

    return bytesToString(decryptedBytes)
  } catch (e) {
    // 解密失败返回空字符串
    return ''
  }
}

/**
 * 简单哈希函数
 * 用于密码等数据的哈希处理，仅用于基本混淆，不适用于真正的安全场景
 * @param {string} password - 需要哈希的字符串
 * @returns {string} 十六进制格式的哈希值
 */
export function hashPassword(password) {
  if (!password) return ''

  const str = String(password)
  let hash = 0

  // 初始哈希计算
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }

  // 添加额外的混淆轮次以增强分布
  let h1 = hash
  let h2 = hash ^ 0x5bd1e995
  let h3 = hash ^ 0x27d4eb2d

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    h1 = ((h1 << 5) - h1 + char) & 0xFFFFFFFF
    h2 = ((h2 << 7) + h2 ^ char) & 0xFFFFFFFF
    h3 = ((h3 * 2654435761) ^ char) & 0xFFFFFFFF
  }

  // 组合三个哈希值并转换为十六进制字符串
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0')
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0')
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0')

  return hex1 + hex2 + hex3
}

/**
 * 加密数据用于本地存储
 * 将JSON可序列化的数据序列化后加密，适用于存入localStorage前的加密处理
 * @param {*} data - 需要加密的数据（必须可JSON序列化）
 * @param {string} key - 加密密钥，未提供时使用默认密钥
 * @returns {string} 加密后的字符串
 */
export function encryptForStorage(data, key) {
  if (data === undefined || data === null) return ''

  try {
    const jsonStr = JSON.stringify(data)
    return encrypt(jsonStr, key)
  } catch (e) {
    // 序列化失败返回空字符串
    return ''
  }
}

/**
 * 从本地存储解密数据
 * 将localStorage中读取的加密字符串解密并还原为原始数据对象
 * @param {string} encrypted - 加密的字符串
 * @param {string} key - 解密密钥，未提供时使用默认密钥
 * @returns {*} 解密后的原始数据对象，解密或解析失败时返回null
 */
export function decryptFromStorage(encrypted, key) {
  if (!encrypted) return null

  try {
    const jsonStr = decrypt(encrypted, key)
    if (!jsonStr) return null
    return JSON.parse(jsonStr)
  } catch (e) {
    // 解密或解析失败返回null
    return null
  }
}
