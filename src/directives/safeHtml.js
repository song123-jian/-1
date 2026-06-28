import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'sub',
  'sup',
  'small',
  'mark',
  'del',
  'ins',
  'blockquote',
  'pre',
  'code'
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height']

const SANITIZE_OPTIONS = { ALLOWED_TAGS, ALLOWED_ATTR }

function sanitize(value) {
  return value ? DOMPurify.sanitize(value, SANITIZE_OPTIONS) : ''
}

export const vSafeHtml = {
  mounted(el, binding) {
    el.innerHTML = sanitize(binding.value)
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      el.innerHTML = sanitize(binding.value)
    }
  }
}
