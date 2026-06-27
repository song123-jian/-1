import { describe, expect, it } from 'vitest'
import { useSmartRecognize } from '../useSmartRecognize.js'

describe('useSmartRecognize', () => {
  it('extracts supplier fields from plain text and applies them to the form', () => {
    const form = {
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      bankName: '',
      bankAccount: '',
      qualification: '',
      category: ''
    }

    const smart = useSmartRecognize(form)
    smart.smartRecInput.value = `
      深圳市冠久科技有限公司
      联系人: 张三
      电话: 13812345678
      邮箱: sales@example.com
      地址: 深圳市南山区科技园科苑路 15 号
      开户银行: 中国工商银行深圳南山支行
      银行账号: 6222001234567890
      资质: ISO9001
    `

    smart.runSmartRecognize()
    smart.applySmartRecognize()

    expect(form.name).toContain('公司')
    expect(form.contact).toBe('张三')
    expect(form.phone).toBe('13812345678')
    expect(form.email).toBe('sales@example.com')
    expect(form.address).toContain('深圳市南山区')
    expect(form.bankAccount).toBe('6222001234567890')
    expect(form.qualification).toContain('ISO9001')
  })
})
