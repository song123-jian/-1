export function numberToChinese(n) {
  if (n === 0) return '零元整'
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿', '万亿']
  const decimal = Math.round(n * 100) % 100
  const integer = Math.floor(n)
  let result = ''
  if (integer > 0) {
    const intStr = String(integer)
    const len = intStr.length
    let zeroFlag = false
    for (let i = 0; i < len; i++) {
      const d = parseInt(intStr[i])
      const pos = len - 1 - i
      const unitIdx = pos % 4
      const bigIdx = Math.floor(pos / 4)
      if (d === 0) {
        zeroFlag = true
        if (unitIdx === 0 && bigIdx > 0) { result += bigUnits[bigIdx]; zeroFlag = false }
      } else {
        if (zeroFlag) { result += '零'; zeroFlag = false }
        result += digits[d] + units[unitIdx]
        if (unitIdx === 0 && bigIdx > 0) result += bigUnits[bigIdx]
      }
    }
    result += '元'
  }
  if (decimal > 0) {
    const jiao = Math.floor(decimal / 10)
    const fen = decimal % 10
    if (jiao > 0) result += digits[jiao] + '角'
    if (fen > 0) result += digits[fen] + '分'
  } else {
    result += '整'
  }
  return '人民币' + result
}
