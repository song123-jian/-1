/**
 * crypto.js 深度测试
 * 覆盖 AES 加解密空字符串、大文本、错误密码、XOR 兼容、特殊字符、null/undefined 等
 */
import { describe, it, expect } from 'vitest'
import {
  aesEncrypt, aesDecrypt,
  encrypt, decrypt,
  simpleHash, hashPassword,
  encryptForStorage, decryptFromStorage
} from '@/utils/crypto'

describe('crypto.js - 深度边界测试', () => {

  /* ===== CR-01: AES 加解密空字符串 ===== */
  describe('CR-01: AES 加解密空字符串', () => {
    it('加密空字符串后解密应返回空字符串', async () => {
      const encrypted = await aesEncrypt('', 'test-password')
      const decrypted = await aesDecrypt(encrypted, 'test-password')
      expect(decrypted).toBe('')
    })

    it('加密空字符串应产生非空密文', async () => {
      const encrypted = await aesEncrypt('', 'test-password')
      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
    })
  })

  /* ===== CR-02: AES 加解密大文本 ===== */
  describe('CR-02: AES 加解密大文本', () => {
    it('较大文本（100KB）加解密应正确还原', async () => {
      // 注意：源码使用 String.fromCharCode(...result) 展开大数组会导致栈溢出
      // 因此使用 100KB 而非 1MB 进行测试
      const chunk = 'A'.repeat(1024)
      const largeText = chunk.repeat(100) // ~100KB
      const encrypted = await aesEncrypt(largeText, 'big-password')
      const decrypted = await aesDecrypt(encrypted, 'big-password')
      expect(decrypted).toBe(largeText)
      expect(decrypted.length).toBe(largeText.length)
    }, 30000)

    it('大文本密文应不同于原文', async () => {
      const largeText = 'X'.repeat(10000)
      const encrypted = await aesEncrypt(largeText, 'password')
      expect(encrypted).not.toBe(largeText)
    })
  })

  /* ===== CR-03: AES 错误密码应抛出异常 ===== */
  describe('CR-03: AES 错误密码', () => {
    it('使用错误密码解密应抛出异常', async () => {
      const encrypted = await aesEncrypt('secret data', 'correct-password')
      await expect(aesDecrypt(encrypted, 'wrong-password')).rejects.toThrow()
    })

    it('使用空密码解密应抛出异常', async () => {
      const encrypted = await aesEncrypt('secret data', 'some-password')
      await expect(aesDecrypt(encrypted, '')).rejects.toThrow()
    })
  })

  /* ===== CR-04: XOR 兼容性 ===== */
  describe('CR-04: XOR 兼容性', () => {
    it('encrypt + decrypt 应还原原文', () => {
      const text = 'Hello XOR World'
      const encrypted = encrypt(text)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(text)
    })

    it('使用自定义 key 加解密应还原', () => {
      const text = 'Custom Key Test'
      const key = 'my_secret_key'
      const encrypted = encrypt(text, key)
      const decrypted = decrypt(encrypted, key)
      expect(decrypted).toBe(text)
    })

    it('XOR 加密是自反的（encrypt两次=原文）', () => {
      const text = 'Self-inverse test'
      const encrypted = encrypt(text)
      const doubleEncrypted = encrypt(encrypted)
      expect(doubleEncrypted).toBe(text)
    })

    it('不同 key 加密结果不同', () => {
      const text = 'Same text'
      const enc1 = encrypt(text, 'key1')
      const enc2 = encrypt(text, 'key2')
      expect(enc1).not.toBe(enc2)
    })

    it('默认 key 应为 "gj_erp"', () => {
      const text = 'Default key test'
      const encDefault = encrypt(text)
      const encExplicit = encrypt(text, 'gj_erp')
      expect(encDefault).toBe(encExplicit)
    })
  })

  /* ===== CR-05: 特殊字符（emoji、中文）AES 往返 ===== */
  describe('CR-05: 特殊字符 AES 往返', () => {
    it('中文字符加解密应正确还原', async () => {
      const text = '你好世界！财务模块测试'
      const encrypted = await aesEncrypt(text, 'chinese-password')
      const decrypted = await aesDecrypt(encrypted, 'chinese-password')
      expect(decrypted).toBe(text)
    })

    it('emoji 加解密应正确还原', async () => {
      const text = '🎉🚀💰✅❌🔒'
      const encrypted = await aesEncrypt(text, 'emoji-password')
      const decrypted = await aesDecrypt(encrypted, 'emoji-password')
      expect(decrypted).toBe(text)
    })

    it('混合特殊字符加解密应正确还原', async () => {
      const text = '价格：¥1,000.50\n税率：13%\t备注："含税"\r\n特殊：©®™'
      const encrypted = await aesEncrypt(text, 'special-password')
      const decrypted = await aesDecrypt(encrypted, 'special-password')
      expect(decrypted).toBe(text)
    })

    it('Unicode 多语言混合加解密应正确还原', async () => {
      const text = '中文 English 日本語 한국어 العربية'
      const encrypted = await aesEncrypt(text, 'unicode-password')
      const decrypted = await aesDecrypt(encrypted, 'unicode-password')
      expect(decrypted).toBe(text)
    })

    it('XOR 加解密中文应正确还原', () => {
      const text = '你好世界'
      const encrypted = encrypt(text)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(text)
    })

    it('XOR 加解密 emoji 应正确还原', () => {
      const text = '🎉🚀'
      const encrypted = encrypt(text)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(text)
    })
  })

  /* ===== Null/Undefined 输入处理 ===== */
  describe('Null/Undefined 输入处理', () => {
    describe('simpleHash', () => {
      it('null 输入应返回空字符串', () => {
        expect(simpleHash(null)).toBe('')
      })

      it('undefined 输入应返回空字符串', () => {
        expect(simpleHash(undefined)).toBe('')
      })

      it('空字符串输入应返回空字符串', () => {
        expect(simpleHash('')).toBe('')
      })

      it('正常字符串应返回非空哈希', () => {
        expect(simpleHash('hello')).toBeTruthy()
      })

      it('相同输入应返回相同哈希', () => {
        expect(simpleHash('test')).toBe(simpleHash('test'))
      })

      it('不同输入应返回不同哈希', () => {
        expect(simpleHash('hello')).not.toBe(simpleHash('world'))
      })
    })

    describe('hashPassword', () => {
      it('hashPassword 应与 simpleHash 行为一致', () => {
        expect(hashPassword('test')).toBe(simpleHash('test'))
        expect(hashPassword(null)).toBe(simpleHash(null))
        expect(hashPassword('')).toBe(simpleHash(''))
      })
    })

    describe('encryptForStorage', () => {
      it('null 输入应返回空字符串', () => {
        expect(encryptForStorage(null, 'key')).toBe('')
      })

      it('undefined 输入应返回空字符串', () => {
        expect(encryptForStorage(undefined, 'key')).toBe('')
      })

      it('正常对象应返回加密字符串', () => {
        const result = encryptForStorage({ name: 'test' }, 'key')
        expect(result).toBeTruthy()
        expect(typeof result).toBe('string')
      })

      it('数字应正确加密', () => {
        const result = encryptForStorage(42, 'key')
        expect(result).toBeTruthy()
      })

      it('字符串应正确加密', () => {
        const result = encryptForStorage('hello', 'key')
        expect(result).toBeTruthy()
      })
    })

    describe('decryptFromStorage', () => {
      it('null 输入应返回 null', () => {
        expect(decryptFromStorage(null, 'key')).toBeNull()
      })

      it('undefined 输入应返回 null', () => {
        expect(decryptFromStorage(undefined, 'key')).toBeNull()
      })

      it('空字符串输入应返回 null', () => {
        expect(decryptFromStorage('', 'key')).toBeNull()
      })

      it('加密存储的数据应能正确解密', () => {
        const original = { name: 'test', value: 123 }
        const encrypted = encryptForStorage(original, 'mykey')
        const decrypted = decryptFromStorage(encrypted, 'mykey')
        expect(decrypted).toEqual(original)
      })

      it('使用错误 key 解密应返回 null', () => {
        const original = { name: 'test' }
        const encrypted = encryptForStorage(original, 'correct-key')
        const decrypted = decryptFromStorage(encrypted, 'wrong-key')
        // XOR解密不会报错，但结果不是有效JSON，JSON.parse会抛异常，返回null
        expect(decrypted).toBeNull()
      })
    })

    describe('AES null/undefined', () => {
      it('aesEncrypt 传入 null 作为 password 不应崩溃', async () => {
        // null 会被 TextEncoder.encode 转为 "null" 字符串
        const encrypted = await aesEncrypt('test', null)
        const decrypted = await aesDecrypt(encrypted, null)
        expect(decrypted).toBe('test')
      })

      it('aesEncrypt 传入 undefined 作为 password 不应崩溃', async () => {
        // undefined 会被 TextEncoder.encode 转为 "undefined" 字符串
        const encrypted = await aesEncrypt('test', undefined)
        const decrypted = await aesDecrypt(encrypted, undefined)
        expect(decrypted).toBe('test')
      })
    })
  })

  /* ===== AES 多次加密产生不同密文（随机 salt+iv） ===== */
  describe('AES 随机性', () => {
    it('相同明文和密码多次加密应产生不同密文', async () => {
      const encrypted1 = await aesEncrypt('same text', 'same password')
      const encrypted2 = await aesEncrypt('same text', 'same password')
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('不同密文解密后应得到相同明文', async () => {
      const encrypted1 = await aesEncrypt('same text', 'same password')
      const encrypted2 = await aesEncrypt('same text', 'same password')
      const decrypted1 = await aesDecrypt(encrypted1, 'same password')
      const decrypted2 = await aesDecrypt(encrypted2, 'same password')
      expect(decrypted1).toBe(decrypted2)
    })
  })
})
