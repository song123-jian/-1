import { ref } from 'vue'

/**
 * 智能识别 composable - 从文本/文件中自动提取客户信息
 * @param {Object} form - 响应式表单对象
 */
export function useSmartRecognize(form) {
  const showSmartRec = ref(false)
  const smartRecInput = ref('')
  const smartRecResult = ref(null)

  // 区域映射表
  const SR_REGION_MAP = {
    '上海': '华东', '江苏': '华东', '浙江': '华东', '安徽': '华东', '福建': '华东', '江西': '华东', '山东': '华东',
    '北京': '华北', '天津': '华北', '河北': '华北', '山西': '华北', '内蒙古': '华北',
    '广东': '华南', '广西': '华南', '海南': '华南',
    '湖北': '华中', '湖南': '华中', '河南': '华中',
    '四川': '西南', '重庆': '西南', '贵州': '西南', '云南': '西南', '西藏': '西南',
    '陕西': '西北', '甘肃': '西北', '青海': '西北', '宁夏': '西北', '新疆': '西北',
    '辽宁': '东北', '吉林': '东北', '黑龙江': '东北'
  }

  /**
   * 解析客户信息文本
   */
  function parseCustomerInfo(text) {
    const items = []
    let identifiedCount = 0
    let lowConfCount = 0

    // 提取手机号
    const phoneMatch = text.match(/1[3-9]\d{9}/)
    if (phoneMatch) {
      const confidence = 95
      items.push({ key: 'phone', label: '手机号码', value: phoneMatch[0], confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
      identifiedCount++
      if (confidence < 80) lowConfCount++
    }

    // 提取邮箱
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) {
      const confidence = 90
      items.push({ key: 'email', label: '邮箱', value: emailMatch[0], confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
      identifiedCount++
      if (confidence < 80) lowConfCount++
    }

    // 提取公司名称（包含"公司"、"集团"、"有限"等关键词）
    const companyMatch = text.match(/[\u4e00-\u9fa5]{2,20}(?:公司|集团|有限|股份|实业|科技|贸易|制造|机械|电子|智能|精密)/)
    if (companyMatch) {
      const confidence = 85
      items.push({ key: 'fullName', label: '客户全称', value: companyMatch[0], confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
      identifiedCount++
      if (confidence < 80) lowConfCount++
    }

    // 提取联系人姓名（2-4个汉字，前面可能有"联系人"、"姓名"等标识）
    const contactPatterns = [
      /(?:联系人|姓名|联系|负责人)[:\s：]*([\u4e00-\u9fa5]{2,4})/,
      /([\u4e00-\u9fa5]{2,4})(?:先生|女士|经理|总|总监|主管)/
    ]
    for (const pattern of contactPatterns) {
      const match = text.match(pattern)
      if (match) {
        const confidence = 75
        items.push({ key: 'contactName', label: '联系人', value: match[1], confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
        identifiedCount++
        if (confidence < 80) lowConfCount++
        break
      }
    }

    // 提取职位
    const positionMatch = text.match(/(?:职位|职务|头衔)[:\s：]*([\u4e00-\u9fa5]{2,8})/)
    if (positionMatch) {
      const confidence = 70
      items.push({ key: 'position', label: '职位', value: positionMatch[1], confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
      identifiedCount++
      if (confidence < 80) lowConfCount++
    }

    // 提取部门
    const deptMatch = text.match(/(?:部门|Dept|Department)[:\s：]*([\u4e00-\u9fa5]{2,8})/i)
    if (deptMatch) {
      const confidence = 65
      items.push({ key: 'department', label: '部门', value: deptMatch[1], confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
      identifiedCount++
      if (confidence < 80) lowConfCount++
    }

    // 提取地区
    for (const [province, region] of Object.entries(SR_REGION_MAP)) {
      if (text.includes(province)) {
        const confidence = 70
        items.push({ key: 'region', label: '地区', value: region, confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
        identifiedCount++
        if (confidence < 80) lowConfCount++
        break
      }
    }

    // 提取地址
    const addrMatch = text.match(/(?:地址|住址|Addr)[:\s：]*(.{5,50})/)
    if (addrMatch) {
      const confidence = 60
      items.push({ key: 'address', label: '地址', value: addrMatch[1].trim(), confidence, confLevel: confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low', confLabel: confidence >= 80 ? '可信' : confidence >= 50 ? '待确认' : '低可信' })
      identifiedCount++
      if (confidence < 80) lowConfCount++
    }

    return { items, identifiedCount, lowConfCount }
  }

  /**
   * 执行智能识别
   */
  function runSmartRecognize() {
    const text = smartRecInput.value.trim()
    if (!text) {
      smartRecResult.value = null
      return
    }
    const result = parseCustomerInfo(text)
    smartRecResult.value = result
  }

  /**
   * 将识别结果填入表单
   */
  function applySmartRecognize() {
    if (!smartRecResult.value || smartRecResult.value.items.length === 0) return
    smartRecResult.value.items.forEach(item => {
      if (item.value && Object.hasOwn(form, item.key)) {
        form[item.key] = item.value
      }
    })
  }

  /**
   * 处理文件上传（读取文本内容后执行识别）
   */
  function handleSmartFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      if (typeof text === 'string' && text.trim()) {
        smartRecInput.value = text.trim()
        runSmartRecognize()
      }
    }
    reader.readAsText(file)
    // 重置 input 以允许再次选择同一文件
    event.target.value = ''
  }

  return {
    showSmartRec,
    smartRecInput,
    smartRecResult,
    runSmartRecognize,
    applySmartRecognize,
    handleSmartFileUpload
  }
}
