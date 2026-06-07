import DOMPurify from 'dompurify'

export const vSafeHtml = {
  mounted(el, binding) {
    if (binding.value) {
      el.innerHTML = DOMPurify.sanitize(binding.value, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'sub', 'sup', 'small', 'mark', 'del', 'ins', 'blockquote', 'pre', 'code'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height']
      })
    } else {
      el.innerHTML = ''
    }
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      if (binding.value) {
        el.innerHTML = DOMPurify.sanitize(binding.value, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'sub', 'sup', 'small', 'mark', 'del', 'ins', 'blockquote', 'pre', 'code'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height']
        })
      } else {
        el.innerHTML = ''
      }
    }
  }
}
